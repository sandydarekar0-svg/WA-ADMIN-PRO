module.exports = (sequelize, DataTypes) => {
    const Webhook = sequelize.define('Webhook', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        url: {
            type: DataTypes.STRING,
            allowNull: false
        },
        
        // Authentication
        secret: DataTypes.STRING,
        authType: {
            type: DataTypes.ENUM('none', 'basic', 'bearer', 'custom'),
            defaultValue: 'none'
        },
        authValue: DataTypes.TEXT,
        
        // Headers
        customHeaders: {
            type: DataTypes.JSON,
            defaultValue: {}
        },
        
        // Events
        events: {
            type: DataTypes.JSON,
            defaultValue: [
                'message.sent', 
                'message.delivered', 
                'message.read', 
                'message.failed',
                'campaign.started',
                'campaign.completed'
            ]
        },
        
        // Status
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        
        // Stats
        totalCalls: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        successCalls: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        failedCalls: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        lastCalledAt: DataTypes.DATE,
        lastStatus: DataTypes.INTEGER,
        lastError: DataTypes.TEXT,
        
        // Retry settings
        retryEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        maxRetries: {
            type: DataTypes.INTEGER,
            defaultValue: 3
        },
        retryDelay: {
            type: DataTypes.INTEGER,
            defaultValue: 5000
        },
        
        // Rate limiting
        rateLimitPerMinute: {
            type: DataTypes.INTEGER,
            defaultValue: 60
        }
    }, {
        timestamps: true
    });

    return Webhook;
};
