require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../models');

async function seed() {
    try {
        console.log('🌱 Starting database seed...');

        await db.sequelize.sync({ force: true });
        console.log('✅ Database synced');

        // Create Plans
        const plans = await db.Plan.bulkCreate([
            {
                name: 'Free',
                slug: 'free',
                description: 'Basic free plan',
                price: 0,
                dailyLimit: 50,
                monthlyLimit: 500,
                features: {
                    bulkSend: true,
                    campaigns: false,
                    templates: true,
                    apiAccess: false,
                    webhooks: false,
                    autoReply: false,
                    scheduling: false,
                    officialApi: false,
                    analytics: false
                },
                maxContacts: 500,
                maxGroups: 5,
                maxTemplates: 5,
                maxCampaigns: 0,
                maxApiKeys: 0,
                isDefault: true,
                isActive: true,
                sortOrder: 1
            },
            {
                name: 'Starter',
                slug: 'starter',
                description: 'Perfect for small businesses',
                price: 29,
                dailyLimit: 500,
                monthlyLimit: 10000,
                features: {
                    bulkSend: true,
                    campaigns: true,
                    templates: true,
                    apiAccess: true,
                    webhooks: true,
                    autoReply: false,
                    scheduling: true,
                    officialApi: false,
                    analytics: true
                },
                maxContacts: 5000,
                maxGroups: 20,
                maxTemplates: 20,
                maxCampaigns: 10,
                maxApiKeys: 2,
                maxWebhooks: 2,
                isActive: true,
                sortOrder: 2
            },
            {
                name: 'Professional',
                slug: 'professional',
                description: 'For growing businesses',
                price: 79,
                dailyLimit: 2000,
                monthlyLimit: 50000,
                features: {
                    bulkSend: true,
                    campaigns: true,
                    templates: true,
                    apiAccess: true,
                    webhooks: true,
                    autoReply: true,
                    scheduling: true,
                    officialApi: true,
                    proxy: true,
                    analytics: true,
                    prioritySupport: true
                },
                maxContacts: 50000,
                maxGroups: 100,
                maxTemplates: 100,
                maxCampaigns: 50,
                maxApiKeys: 10,
                maxWebhooks: 10,
                isFeatured: true,
                isActive: true,
                sortOrder: 3
            },
            {
                name: 'Enterprise',
                slug: 'enterprise',
                description: 'Unlimited everything',
                price: 199,
                dailyLimit: 10000,
                monthlyLimit: 500000,
                features: {
                    bulkSend: true,
                    campaigns: true,
                    templates: true,
                    apiAccess: true,
                    webhooks: true,
                    autoReply: true,
                    scheduling: true,
                    officialApi: true,
                    proxy: true,
                    analytics: true,
                    multiDevice: true,
                    prioritySupport: true,
                    whiteLabel: true
                },
                maxContacts: -1,
                maxGroups: -1,
                maxTemplates: -1,
                maxCampaigns: -1,
                maxApiKeys: -1,
                maxWebhooks: -1,
                isActive: true,
                sortOrder: 4
            }
        ]);
        console.log('✅ Plans created');

        // Create Super Admin
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123456', 12);
        
        const admin = await db.User.create({
            name: 'Super Admin',
            email: process.env.ADMIN_EMAIL || 'admin@example.com',
            password: hashedPassword,
            role: 'superadmin',
            planId: plans[3].id,
            credits: 1000000,
            dailyLimit: 100000,
            monthlyLimit: 1000000,
            isActive: true,
            isVerified: true,
            canCreateUsers: true,
            maxSubUsers: -1
        });
        console.log('✅ Super Admin created');

        // Create Demo User
        const demoPassword = await bcrypt.hash('Demo@123456', 12);
        await db.User.create({
            name: 'Demo User',
            email: 'demo@example.com',
            password: demoPassword,
            role: 'user',
            planId: plans[1].id,
            credits: 1000,
            dailyLimit: 500,
            monthlyLimit: 10000,
            isActive: true,
            isVerified: true
        });
        console.log('✅ Demo user created');

        // Create Global Templates
        await db.Template.bulkCreate([
            {
                userId: null,
                createdBy: admin.id,
                name: 'Welcome Message',
                slug: 'welcome',
                category: 'greeting',
                content: 'Hello {{name}}! 👋\n\nWelcome to our service. We\'re excited to have you on board!\n\nIf you have any questions, feel free to reach out.',
                variables: ['name'],
                isGlobal: true,
                isEditable: false,
                isLocked: true,
                isActive: true
            },
            {
                userId: null,
                createdBy: admin.id,
                name: 'Order Confirmation',
                slug: 'order-confirmation',
                category: 'notification',
                content: 'Hi {{name}},\n\nYour order #{{order_id}} has been confirmed! 🎉\n\nOrder Total: {{amount}}\nEstimated Delivery: {{delivery_date}}\n\nThank you for shopping with us!',
                variables: ['name', 'order_id', 'amount', 'delivery_date'],
                isGlobal: true,
                isEditable: false,
                isLocked: true,
                isActive: true
            },
            {
                userId: null,
                createdBy: admin.id,
                name: 'Promotional Offer',
                slug: 'promo-offer',
                category: 'marketing',
                content: '🔥 SPECIAL OFFER for {{name}}! 🔥\n\n{Get|Grab|Claim} {{discount}}% OFF on your next purchase!\n\nUse code: {{code}}\n\nValid until {{expiry}}\n\nShop now: {{link}}',
                variables: ['name', 'discount', 'code', 'expiry', 'link'],
                useSpintax: true,
                isGlobal: true,
                isEditable: false,
                isLocked: true,
                isActive: true
            }
        ]);
        console.log('✅ Global templates created');

        // Create System Settings
        await db.SystemSettings.bulkCreate([
            { key: 'app_name', value: 'WhatsApp Bulk Sender', type: 'string', category: 'general' },
            { key: 'app_url', value: 'http://localhost:3000', type: 'string', category: 'general' },
            { key: 'maintenance_mode', value: 'false', type: 'boolean', category: 'general' },
            { key: 'registration_enabled', value: 'true', type: 'boolean', category: 'auth' },
            { key: 'email_verification', value: 'false', type: 'boolean', category: 'auth' },
            { key: 'default_plan', value: plans[0].id, type: 'string', category: 'billing' },
            { key: 'credit_system_enabled', value: 'true', type: 'boolean', category: 'billing' },
            { key: 'default_min_delay', value: '3000', type: 'number', category: 'messaging' },
            { key: 'default_max_delay', value: '8000', type: 'number', category: 'messaging' },
            { key: 'default_batch_size', value: '50', type: 'number', category: 'messaging' },
            { key: 'anti_ban_enabled', value: 'true', type: 'boolean', category: 'messaging' },
            { key: 'proxy_enabled', value: 'false', type: 'boolean', category: 'proxy' }
        ]);
        console.log('✅ System settings created');

        console.log('\n🎉 Database seeded successfully!');
        console.log('\n📋 Login Credentials:');
        console.log(`   Admin: ${process.env.ADMIN_EMAIL || 'admin@example.com'} / ${process.env.ADMIN_PASSWORD || 'Admin@123456'}`);
        console.log('   Demo: demo@example.com / Demo@123456');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
}

seed();
