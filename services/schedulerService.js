const cron = require('node-cron');
const ScheduledMessage = require('../models/ScheduledMessage');
const campaignService = require('./campaignService');

class SchedulerService {
    init() {
        // Run every minute to check for pending scheduled tasks
        cron.schedule('* * * * *', async () => {
            const now = new Date();
            const pendingTasks = await ScheduledMessage.find({
                scheduledTime: { $lte: now },
                status: 'pending'
            });

            for (const task of pendingTasks) {
                task.status = 'processing';
                await task.save();
                
                // Trigger the campaign logic
                await campaignService.startCampaign(task.campaignId);
                
                task.status = 'completed';
                await task.save();
            }
        });
    }
}

module.exports = new SchedulerService();
