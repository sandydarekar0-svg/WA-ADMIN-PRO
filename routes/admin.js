const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authMiddleware } = require('../middleware/auth');
const { adminMiddleware } = require('../middleware/admin');
const db = require('../models');
const CreditService = require('../services/creditService');

// ============ DASHBOARD ============
router.get('/dashboard', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const [
            totalUsers,
            activeUsers,
            totalMessages,
            todayMessages,
            totalCampaigns,
            activeCampaigns,
            totalCredits,
            usedCredits
        ] = await Promise.all([
            db.User.count(),
            db.User.count({ where: { isActive: true, whatsappConnected: true } }),
            db.Message.count(),
            db.Message.count({
                where: {
                    createdAt: { [db.Sequelize.Op.gte]: new Date().setHours(0, 0, 0, 0) }
                }
            }),
            db.Campaign.count(),
            db.Campaign.count({ where: { status: 'running' } }),
            db.User.sum('credits'),
            db.User.sum('creditsUsed')
        ]);

        // Get recent activity
        const recentActivity = await db.ActivityLog.findAll({
            limit: 20,
            order: [['createdAt', 'DESC']],
            include: [{ model: db.User, attributes: ['name', 'email'] }]
        });

        // Get message stats for last 7 days
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);

        const messageStats = await db.Message.findAll({
            where: { createdAt: { [db.Sequelize.Op.gte]: last7Days } },
            attributes: [
                [db.Sequelize.fn('DATE', db.Sequelize.col('createdAt')), 'date'],
                [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
            ],
            group: [db.Sequelize.fn('DATE', db.Sequelize.col('createdAt'))],
            order: [[db.Sequelize.fn('DATE', db.Sequelize.col('createdAt')), 'ASC']]
        });

        res.json({
            success: true,
            stats: {
                users: { total: totalUsers, active: activeUsers },
                messages: { total: totalMessages, today: todayMessages },
                campaigns: { total: totalCampaigns, active: activeCampaigns },
                credits: { total: totalCredits || 0, used: usedCredits || 0 }
            },
            messageStats,
            recentActivity
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ USERS ============
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 20, search, role, status } = req.query;
        const where = {};

        if (req.user.role === 'reseller') {
            where.parentId = req.user.id;
        }

        if (search) {
            where[db.Sequelize.Op.or] = [
                { name: { [db.Sequelize.Op.like]: `%${search}%` } },
                { email: { [db.Sequelize.Op.like]: `%${search}%` } }
            ];
        }

        if (role) where.role = role;
        if (status === 'active') where.isActive = true;
        if (status === 'inactive') where.isActive = false;
        if (status === 'banned') where.isBanned = true;

        const offset = (page - 1) * limit;

        const { count, rows: users } = await db.User.findAndCountAll({
            where,
            include: [
                { model: db.Plan, attributes: ['name', 'slug'] },
                { model: db.User, as: 'parent', attributes: ['name', 'email'] }
            ],
            attributes: { exclude: ['password', 'twoFactorSecret'] },
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        res.json({
            success: true,
            users,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/users', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const {
            name, email, password, phone, role, planId,
            credits, dailyLimit, monthlyLimit, isActive,
            canCreateUsers, maxSubUsers, expiresAt
        } = req.body;

        const existingUser = await db.User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await db.User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            role: role || 'user',
            planId,
            credits: credits || 0,
            dailyLimit: dailyLimit || 100,
            monthlyLimit: monthlyLimit || 3000,
            isActive: isActive !== false,
            canCreateUsers: canCreateUsers || false,
            maxSubUsers: maxSubUsers || 0,
            expiresAt,
            parentId: req.user.role === 'reseller' ? req.user.id : null
        });

        // Log activity
        await db.ActivityLog.create({
            userId: req.user.id,
            action: 'user.create',
            category: 'users',
            description: `Created user: ${email}`,
            targetType: 'User',
            targetId: user.id,
            ip: req.ip
        });

        res.status(201).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const user = await db.User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Resellers can only edit their own users
        if (req.user.role === 'reseller' && user.parentId !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const updateData = { ...req.body };
        delete updateData.password;
        delete updateData.id;

        // If password is being changed
        if (req.body.newPassword) {
            updateData.password = await bcrypt.hash(req.body.newPassword, 12);
        }

        await user.update(updateData);

        await db.ActivityLog.create({
            userId: req.user.id,
            action: 'user.update',
            category: 'users',
            description: `Updated user: ${user.email}`,
            targetType: 'User',
            targetId: user.id,
            ip: req.ip
        });

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const user = await db.User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.role === 'superadmin') {
            return res.status(400).json({ error: 'Cannot delete super admin' });
        }

        await user.destroy();

        await db.ActivityLog.create({
            userId: req.user.id,
            action: 'user.delete',
            category: 'users',
            description: `Deleted user: ${user.email}`,
            targetType: 'User',
            targetId: user.id,
            ip: req.ip
        });

        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ban/Unban user
router.post('/users/:id/ban', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const user = await db.User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await user.update({
            isBanned: true,
            banReason: req.body.reason,
            isActive: false
        });

        res.json({ success: true, message: 'User banned' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/users/:id/unban', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const user = await db.User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await user.update({
            isBanned: false,
            banReason: null,
            isActive: true
        });

        res.json({ success: true, message: 'User unbanned' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add credits
router.post('/users/:id/credits', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { amount, description } = req.body;

        if (!amount || amount === 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const type = amount > 0 ? 'admin_add' : 'admin_deduct';
        const result = await CreditService.addCredits(
            req.params.id,
            amount,
            type,
            description || `Credits ${amount > 0 ? 'added' : 'deducted'} by admin`,
            req.user.id
        );

        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reset daily usage
router.post('/users/:id/reset-daily', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await db.User.update(
            { messagesUsedToday: 0 },
            { where: { id: req.params.id } }
        );
        res.json({ success: true, message: 'Daily usage reset' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ PLANS ============
router.get('/plans', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const plans = await db.Plan.findAll({
            order: [['sortOrder', 'ASC']],
            include: [{
                model: db.User,
                attributes: ['id']
            }]
        });

        const plansWithCount = plans.map(plan => ({
            ...plan.toJSON(),
            userCount: plan.Users?.length || 0
        }));

        res.json({ success: true, plans: plansWithCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/plans', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can create plans' });
        }

        const plan = await db.Plan.create(req.body);
        res.status(201).json({ success: true, plan });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/plans/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const plan = await db.Plan.findByPk(req.params.id);
        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        await plan.update(req.body);
        res.json({ success: true, plan });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/plans/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const plan = await db.Plan.findByPk(req.params.id);
        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        // Check if any users are on this plan
        const usersCount = await db.User.count({ where: { planId: plan.id } });
        if (usersCount > 0) {
            return res.status(400).json({ 
                error: `Cannot delete plan with ${usersCount} active users` 
            });
        }

        await plan.destroy();
        res.json({ success: true, message: 'Plan deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ TEMPLATES (Admin Only) ============
router.get('/templates', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const templates = await db.Template.findAll({
            where: {
                [db.Sequelize.Op.or]: [
                    { isGlobal: true },
                    { createdBy: req.user.id }
                ]
            },
            include: [
                { model: db.User, as: 'creator', attributes: ['name', 'email'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({ success: true, templates });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/templates', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const template = await db.Template.create({
            ...req.body,
            createdBy: req.user.id,
            isGlobal: req.body.isGlobal || false,
            isEditable: req.body.isEditable || false,
            isLocked: req.body.isLocked || true
        });

        res.status(201).json({ success: true, template });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/templates/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const template = await db.Template.findByPk(req.params.id);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        await template.update(req.body);
        res.json({ success: true, template });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/templates/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const template = await db.Template.findByPk(req.params.id);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        await template.destroy();
        res.json({ success: true, message: 'Template deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ PROXIES ============
router.get('/proxies', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const proxies = await db.ProxyConfig.findAll({
            where: { isGlobal: true },
            order: [['priority', 'ASC']]
        });

        res.json({ success: true, proxies });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/proxies', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const proxy = await db.ProxyConfig.create({
            ...req.body,
            isGlobal: true
        });

        res.status(201).json({ success: true, proxy });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/proxies/:id/test', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const ProxyService = require('../services/proxyService');
        const result = await ProxyService.checkProxy(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/proxies/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await db.ProxyConfig.destroy({ where: { id: req.params.id } });
        res.json({ success: true, message: 'Proxy deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ SYSTEM SETTINGS ============
router.get('/settings', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const settings = await db.SystemSettings.findAll();
        
        const settingsObj = {};
        settings.forEach(s => {
            let value = s.value;
            if (s.type === 'number') value = parseFloat(value);
            if (s.type === 'boolean') value = value === 'true';
            if (s.type === 'json') value = JSON.parse(value);
            settingsObj[s.key] = value;
        });

        res.json({ success: true, settings: settingsObj });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/settings', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        for (const [key, value] of Object.entries(req.body)) {
            await db.SystemSettings.upsert({
                key,
                value: typeof value === 'object' ? JSON.stringify(value) : String(value),
                type: typeof value === 'object' ? 'json' : typeof value
            });
        }

        res.json({ success: true, message: 'Settings updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ ACTIVITY LOGS ============
router.get('/logs', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 50, userId, action, category } = req.query;
        const where = {};

        if (userId) where.userId = userId;
        if (action) where.action = { [db.Sequelize.Op.like]: `%${action}%` };
        if (category) where.category = category;

        const offset = (page - 1) * limit;

        const { count, rows: logs } = await db.ActivityLog.findAndCountAll({
            where,
            include: [{ model: db.User, attributes: ['name', 'email'] }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        res.json({
            success: true,
            logs,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ MESSAGES ============
router.get('/messages', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 50, userId, status, campaignId } = req.query;
        const where = {};

        if (userId) where.userId = userId;
        if (status) where.status = status;
        if (campaignId) where.campaignId = campaignId;

        const offset = (page - 1) * limit;

        const { count, rows: messages } = await db.Message.findAndCountAll({
            where,
            include: [
                { model: db.User, attributes: ['name', 'email'] },
                { model: db.Campaign, attributes: ['name'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        res.json({
            success: true,
            messages,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ BROADCAST TO ALL ============
router.post('/broadcast', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { message, userRole, isActive } = req.body;

        // This would send a notification to all users via socket
        const where = {};
        if (userRole) where.role = userRole;
        if (isActive !== undefined) where.isActive = isActive;

        const users = await db.User.findAll({ where, attributes: ['id'] });

        for (const user of users) {
            if (global.io) {
                global.io.to(`user-${user.id}`).emit('admin-broadcast', {
                    message,
                    timestamp: new Date()
                });
            }
        }

        res.json({ success: true, sentTo: users.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
