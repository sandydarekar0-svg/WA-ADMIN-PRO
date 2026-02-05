const cron = require('node-cron');
const db = require('../models');

// Reset daily usage at midnight
const dailyReset = cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Resetting daily message counts...');
    
    try {
        await db.User.update(
            { messagesUsedToday: 0 },
            { where: {} }
        );
        console.log('[Cron] Daily reset complete');
    } catch (error) {
        console.error('[Cron] Daily reset error:', error);
    }
}, { scheduled: false });

// Reset monthly usage on 1st of each month
const monthlyReset = cron.schedule('0 0 1 * *', async () => {
    console.log('[Cron] Resetting monthly message counts...');
    
    try {
        await db.User.update(
            { messagesUsedMonth: 0 },
            { where: {} }
        );
        console.log('[Cron] Monthly reset complete');
    } catch (error) {
        console.error('[Cron] Monthly reset error:', error);
    }
}, { scheduled: false });

module.exports = { dailyReset, monthlyReset };
