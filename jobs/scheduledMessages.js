const cron = require('node-cron');
const db = require('../models');
const { Op } = require('sequelize');

const processScheduledMessages = cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();
        
        // Get due messages
        const messages = await db.ScheduledMessage.findAll({
            where: {
                status: 'pending',
                scheduledAt: { [Op.lte]: now }
            },
            limit: 100
        });

        for (const msg of messages) {
            try {
                const waService = global.whatsappInstances.get(msg.userId);
                
                if (!waService || !waService.isConnected) {
                    await msg.update({ status: 'failed', errorMessage: 'WhatsApp not connected' });
                    continue;
                }

                await waService.sendMessage(msg.phone, msg.message, {
                    mediaType: msg.mediaType,
                    mediaUrl: msg.mediaUrl
                });

                await msg.update({ status: 'sent', sentAt: new Date() });

                // Handle recurring
                if (msg.recurring && msg.recurringPattern) {
                    const nextRun = calculateNextRun(msg.recurringPattern);
                    if (nextRun) {
                        await db.ScheduledMessage.create({
                            ...msg.toJSON(),
                            id: undefined,
                            scheduledAt: nextRun,
                            status: 'pending',
                            sentAt: null
                        });
                    }
                }
            } catch (error) {
                await msg.update({ status: 'failed', errorMessage: error.message });
            }
        }

        // Process scheduled campaigns
        const campaigns = await db.Campaign.findAll({
            where: {
                status: 'scheduled',
                scheduledAt: { [Op.lte]: now }
            }
        });

        const CampaignService = require('../services/campaignService');
        for (const campaign of campaigns) {
            CampaignService.startCampaign(campaign.id, campaign.userId);
        }

    } catch (error) {
        console.error('[Scheduler] Error:', error);
    }
}, { scheduled: false });

function calculateNextRun(pattern) {
    const now = new Date();
    switch (pattern.type) {
        case 'daily':
            return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        case 'weekly':
            return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        case 'monthly':
            const next = new Date(now);
            next.setMonth(next.getMonth() + 1);
            return next;
        default:
            return null;
    }
}

module.exports = { processScheduledMessages };
