const express = require('express');
const router = express.Router();
const WebhookLog = require('../models/WebhookLog');

// Verification for Meta Webhooks
router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token === process.env.WEBHOOK_VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Handling incoming data
router.post('/', async (req, res) => {
    const data = req.body;
    await WebhookLog.create({ payload: data });
    
    // Logic to update message status to 'Read' in your DB
    console.log("Webhook Received:", JSON.stringify(data));
    res.sendStatus(200);
});

module.exports = router;
