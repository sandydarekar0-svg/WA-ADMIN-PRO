module.exports = (sequelize, DataTypes) => {
    const AutoReply = sequelize.define('AutoReply', {
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
        
        // Trigger
        triggerType: {
            type: DataTypes.ENUM('keyword', 'contains', 'regex', 'all'),
            defaultValue: 'keyword'
        },
        triggerValue: {
            type: DataTypes.STRING,
            allowNull: true
        },
        isCaseSensitive: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        
        // Response
        responseType: {
            type: DataTypes.ENUM('text', 'template', 'media'),
            defaultValue: 'text'
        },
        responseContent: DataTypes.TEXT,
        templateId: DataTypes.UUID,
        
        // Media
        mediaType: DataTypes.STRING,
        mediaUrl: DataTypes.STRING,
        
        // Delay
        replyDelay: {
            type: DataTypes.INTEGER,
            defaultValue: 1000
        },
        
        // Limits
        maxRepliesPerUser: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: '0 = unlimited'
        },
        cooldownMinutes: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        
        // Schedule
        activeHoursStart: DataTypes.TIME,
        activeHoursEnd: DataTypes.TIME,
        activeDays: {
            type: DataTypes.JSON,
            defaultValue: [0, 1, 2, 3, 4, 5, 6]
        },
        
        // Status
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        
        // Stats
        triggerCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        
        priority: {
            type: DataTypes.INTEGER,
            defaultValue: 5
        }
    }, {
        timestamps: true
    });

    return AutoReply;
};
