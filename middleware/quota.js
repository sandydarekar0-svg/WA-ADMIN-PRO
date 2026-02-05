const db = require('../models');

const quotaMiddleware = async (req, res, next) => {
    try {
        const user = req.user;

        // Check if user is active
        if (!user.isActive) {
            return res.status(403).json({ error: 'Account is deactivated' });
        }

        // Check if user is banned
        if (user.isBanned) {
            return res.status(403).json({ error: 'Account is banned: ' + user.banReason });
        }

        // Check if account expired
        if (user.expiresAt && new Date(user.expiresAt) < new Date()) {
            return res.status(403).json({ error: 'Account has expired' });
        }

        // Check daily limit
        if (user.messagesUsedToday >= user.dailyLimit) {
            return res.status(429).json({ 
                error: 'Daily message limit reached',
                limit: user.dailyLimit,
                used: user.messagesUsedToday,
                resetsAt: new Date().setHours(24, 0, 0, 0)
            });
        }

        // Check monthly limit
        if (user.messagesUsedMonth >= user.monthlyLimit) {
            return res.status(429).json({ 
                error: 'Monthly message limit reached',
                limit: user.monthlyLimit,
                used: user.messagesUsedMonth
            });
        }

        // Check credits (if credit system is enabled)
        if (process.env.ENABLE_CREDIT_SYSTEM === 'true') {
            const available = user.credits - user.creditsUsed;
            if (available <= 0) {
                return res.status(429).json({ 
                    error: 'No credits available',
                    credits: user.credits,
                    used: user.creditsUsed
                });
            }
        }

        next();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { quotaMiddleware };
