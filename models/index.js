const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false,
        pool: { max: 20, min: 0, acquire: 60000, idle: 10000 },
        define: { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
    }
);

const db = { Sequelize, sequelize };

// Load all models
const models = [
    'User', 'Plan', 'Template', 'Contact', 'ContactGroup', 
    'Campaign', 'Message', 'ApiKey', 'Webhook', 'WebhookLog',
    'CreditTransaction', 'Blacklist', 'AutoReply', 'ScheduledMessage',
    'ProxyConfig', 'SystemSettings', 'ActivityLog'
];

models.forEach(model => {
    db[model] = require(`./${model}`)(sequelize, Sequelize);
});

// ============ ASSOCIATIONS ============

// User Associations
db.User.belongsTo(db.Plan, { foreignKey: 'planId' });
db.User.belongsTo(db.User, { as: 'parent', foreignKey: 'parentId' });
db.User.hasMany(db.User, { as: 'children', foreignKey: 'parentId' });

db.User.hasMany(db.Template, { foreignKey: 'userId' });
db.User.hasMany(db.Contact, { foreignKey: 'userId' });
db.User.hasMany(db.ContactGroup, { foreignKey: 'userId' });
db.User.hasMany(db.Campaign, { foreignKey: 'userId' });
db.User.hasMany(db.Message, { foreignKey: 'userId' });
db.User.hasMany(db.ApiKey, { foreignKey: 'userId' });
db.User.hasMany(db.Webhook, { foreignKey: 'userId' });
db.User.hasMany(db.CreditTransaction, { foreignKey: 'userId' });
db.User.hasMany(db.Blacklist, { foreignKey: 'userId' });
db.User.hasMany(db.AutoReply, { foreignKey: 'userId' });
db.User.hasMany(db.ScheduledMessage, { foreignKey: 'userId' });
db.User.hasMany(db.ActivityLog, { foreignKey: 'userId' });

// Plan Associations
db.Plan.hasMany(db.User, { foreignKey: 'planId' });

// Template Associations
db.Template.belongsTo(db.User, { foreignKey: 'userId' });
db.Template.belongsTo(db.User, { as: 'creator', foreignKey: 'createdBy' });

// Contact Associations
db.Contact.belongsTo(db.User, { foreignKey: 'userId' });
db.Contact.belongsTo(db.ContactGroup, { foreignKey: 'groupId' });
db.ContactGroup.hasMany(db.Contact, { foreignKey: 'groupId' });
db.ContactGroup.belongsTo(db.User, { foreignKey: 'userId' });

// Campaign Associations
db.Campaign.belongsTo(db.User, { foreignKey: 'userId' });
db.Campaign.belongsTo(db.Template, { foreignKey: 'templateId' });
db.Campaign.hasMany(db.Message, { foreignKey: 'campaignId' });

// Message Associations
db.Message.belongsTo(db.User, { foreignKey: 'userId' });
db.Message.belongsTo(db.Campaign, { foreignKey: 'campaignId' });

// API Key Associations
db.ApiKey.belongsTo(db.User, { foreignKey: 'userId' });

// Webhook Associations
db.Webhook.belongsTo(db.User, { foreignKey: 'userId' });
db.Webhook.hasMany(db.WebhookLog, { foreignKey: 'webhookId' });
db.WebhookLog.belongsTo(db.Webhook, { foreignKey: 'webhookId' });

// Credit Transaction Associations
db.CreditTransaction.belongsTo(db.User, { foreignKey: 'userId' });
db.CreditTransaction.belongsTo(db.User, { as: 'admin', foreignKey: 'addedBy' });

// Activity Log
db.ActivityLog.belongsTo(db.User, { foreignKey: 'userId' });

module.exports = db;
