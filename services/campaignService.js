const Campaign = require('../models/Campaign');
const Message = require('../models/Message');
const Contact = require('../models/Contact');
const whatsappService = require('./whatsappService');
const creditService = require('./creditService');

class CampaignService {
    async startCampaign(campaignId) {
        const campaign = await Campaign.findById(campaignId).populate('contacts');
        if (!campaign || campaign.status !== 'pending') return;

        campaign.status = 'processing';
        await campaign.save();

        for (const contactId of campaign.contacts) {
            // 1. Check if user has enough credits
            const hasCredits = await creditService.checkAndDeduct(campaign.userId, 1);
            if (!hasCredits) {
                campaign.status = 'failed';
                campaign.errorLog = 'Insufficient credits';
                await campaign.save();
                break;
            }

            try {
                // 2. Send via WhatsApp Service
                const result = await whatsappService.sendMessage(campaign.userId, contactId.phone, campaign.content);
                
                // 3. Log the message
                await Message.create({
                    campaignId: campaign._id,
                    recipient: contactId.phone,
                    status: 'sent',
                    timestamp: new Date()
                });

                // 4. Random Delay (Crucial to avoid bans: 5-15 seconds)
                const delay = Math.floor(Math.random() * (15000 - 5000 + 1) + 5000);
                await new Promise(resolve => setTimeout(resolve, delay));

            } catch (err) {
                console.error(`Failed to send to ${contactId.phone}:`, err);
            }
        }

        campaign.status = 'completed';
        await campaign.save();
    }
}

module.exports = new CampaignService();
