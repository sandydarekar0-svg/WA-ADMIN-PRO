const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false,
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require('../models/User')(sequelize, Sequelize);
db.Template = require('../models/Template')(sequelize, Sequelize);
db.Contact = require('../models/Contact')(sequelize, Sequelize);
db.ContactGroup = require('../models/ContactGroup')(sequelize, Sequelize);
db.Campaign = require('../models/Campaign')(sequelize, Sequelize);
db.Message = require('../models/Message')(sequelize, Sequelize);
db.ApiKey = require('../models/ApiKey')(sequelize, Sequelize);
db.Webhook = require('../models/Webhook')(sequelize, Sequelize);
db.ScheduledMessage = require('../models/ScheduledMessage')(sequelize, Sequelize);

// Associations
db.User.hasMany(db.Template, { foreignKey: 'userId' });
db.User.hasMany(db.Contact, { foreignKey: 'userId' });
db.User.hasMany(db.ContactGroup, { foreignKey: 'userId' });
db.User.hasMany(db.Campaign, { foreignKey: 'userId' });
db.User.hasMany(db.ApiKey, { foreignKey: 'userId' });
db.User.hasMany(db.Webhook, { foreignKey: 'userId' });

db.ContactGroup.hasMany(db.Contact, { foreignKey: 'groupId' });
db.Contact.belongsTo(db.ContactGroup, { foreignKey: 'groupId' });

db.Campaign.hasMany(db.Message, { foreignKey: 'campaignId' });
db.Message.belongsTo(db.Campaign, { foreignKey: 'campaignId' });

db.Template.hasMany(db.Campaign, { foreignKey: 'templateId' });

module.exports = db;
