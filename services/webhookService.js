const axios = require('axios');
const crypto = require('crypto');
const db = require('../models');

class WebhookService {
    static async trigger(userId, event, data) {
        try {
            const webhooks = await db.Webhook.findAll({
                where: {
                    userId,
                    isActive: true
                }
            });

            for (const webhook of webhooks) {
                if (!webhook.events.includes(event)) continue;

                this.send(webhook, event, data);
            }
        } catch (error) {
            console.error('[Webhook] Trigger error:', error.message);
        }
    }

    static async send(webhook, event, data, retryCount = 0) {
        const payload = {
            event,
            timestamp: new Date().toISOString(),
            data
        };

        const headers = {
            'Content-Type': 'application/json',
            'X-Webhook-Event': event,
            'X-Webhook-Timestamp': payload.timestamp,
            ...webhook.customHeaders
        };

        // Add signature
        if (webhook.secret) {
            const signature = crypto
                .createHmac('sha256', webhook.secret)
                .update(JSON.stringify(payload))
                .digest('hex');
            headers['X-Webhook-Signature'] = signature;
        }

        // Add auth
        if (webhook.authType === 'bearer' && webhook.authValue) {
            headers['Authorization'] = `Bearer ${webhook.authValue}`;
        } else if (webhook.authType === 'basic' && webhook.authValue) {
            headers['Authorization'] = `Basic ${Buffer.from(webhook.authValue).toString('base64')}`;
        }

        try {
            const response = await axios.post(webhook.url, payload, {
                headers,
                timeout: 30000
            });

            // Log success
            await db.WebhookLog.create({
                webhookId: webhook.id,
                event,
                payload: JSON.stringify(payload),
                response: JSON.stringify(response.data),
                statusCode: response.status,
                success: true
            });

            // Update webhook stats
            await webhook.update({
                totalCalls: webhook.totalCalls + 1,
                successCalls: webhook.successCalls + 1,
                lastCalledAt: new Date(),
                lastStatus: response.status,
                lastError: null
            });

            console.log(`[Webhook] ${webhook.name} - ${event} - Success`);

        } catch (error) {
            const statusCode = error.response?.status || 0;
            const errorMessage = error.response?.data || error.message;

            // Log failure
            await db.WebhookLog.create({
                webhookId: webhook.id,
                event,
                payload: JSON.stringify(payload),
                response: JSON.stringify(errorMessage),
                statusCode,
                success: false,
                error: error.message
            });

            // Update webhook stats
            await webhook.update({
                totalCalls: webhook.totalCalls + 1,
                failedCalls: webhook.failedCalls + 1,
                lastCalledAt: new Date(),
                lastStatus: statusCode,
                lastError: error.message
            });

            console.error(`[Webhook] ${webhook.name} - ${event} - Failed: ${error.message}`);

            // Retry
            if (webhook.retryEnabled && retryCount < webhook.maxRetries) {
                setTimeout(() => {
                    this.send(webhook, event, data, retryCount + 1);
                }, webhook.retryDelay * (retryCount + 1));
            }
        }
    }

    static async testWebhook(webhookId) {
        const webhook = await db.Webhook.findByPk(webhookId);
        if (!webhook) throw new Error('Webhook not found');

        await this.send(webhook, 'test', {
            message: 'This is a test webhook',
            timestamp: new Date().toISOString()
        });

        return { success: true };
    }
}

module.exports = WebhookService;
