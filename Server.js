require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

// Database
const db = require('./models');

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const whatsappRoutes = require('./routes/whatsapp');
const templateRoutes = require('./routes/templates');
const contactRoutes = require('./routes/contacts');
const campaignRoutes = require('./routes/campaigns');
const apiRoutes = require('./routes/api');
const webhookRoutes = require('./routes/webhooks');
const analyticsRoutes = require('./routes/analytics');
const officialApiRoutes = require('./routes/officialApi');

// Jobs
const { dailyReset, monthlyReset } = require('./jobs/quotaReset');
const { processScheduledMessages } = require('./jobs/scheduledMessages');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Global instances
app.set('io', io);
global.whatsappInstances = new Map();
global.io = io;

// Request logging (development)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
        next();
    });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/external', apiRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/official', officialApiRoutes);

// Meta Webhook Verification
app.get('/webhook/meta', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
        console.log('[Meta] Webhook verified');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Meta Webhook Handler
app.post('/webhook/meta', express.json(), async (req, res) => {
    try {
        const body = req.body;

        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry) {
                for (const change of entry.changes) {
                    if (change.field === 'messages') {
                        // Handle incoming messages & status updates
                        const value = change.value;
                        
                        if (value.statuses) {
                            for (const status of value.statuses) {
                                await db.Message.update(
                                    { 
                                        status: status.status,
                                        ...(status.status === 'delivered' && { deliveredAt: new Date() }),
                                        ...(status.status === 'read' && { readAt: new Date() })
                                    },
                                    { where: { whatsappMessageId: status.id } }
                                );
                            }
                        }
                    }
                }
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('[Meta Webhook] Error:', error);
        res.sendStatus(500);
    }
});

// Socket.IO
io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on('join-room', (userId) => {
        socket.join(`user-${userId}`);
        console.log(`[Socket] User ${userId} joined`);
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] Disconnected: ${socket.id}`);
    });
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[Error]', err);
    res.status(500).json({ error: err.message });
});

// Start server
const PORT = process.env.PORT || 3000;

db.sequelize.sync({ alter: true }).then(() => {
    console.log('✅ Database synced');

    // Start cron jobs
    if (process.env.ENABLE_SCHEDULER === 'true') {
        dailyReset.start();
        monthlyReset.start();
        processScheduledMessages.start();
        console.log('✅ Schedulers started');
    }

    server.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📊 Admin panel: http://localhost:${PORT}/admin`);
        console.log(`📱 WhatsApp Bulk Sender Enterprise Ready!`);
    });
}).catch(err => {
    console.error('❌ Database connection failed:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    
    for (const [userId, instance] of global.whatsappInstances) {
        try {
            await instance.logout();
        } catch (e) {}
    }
    
    process.exit(0);
});
