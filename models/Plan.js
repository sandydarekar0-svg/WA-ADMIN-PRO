module.exports = (sequelize, DataTypes) => {
    const Plan = sequelize.define('Plan', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        slug: {
            type: DataTypes.STRING,
            unique: true
        },
        description: DataTypes.TEXT,
        
        // Pricing
        price: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        currency: {
            type: DataTypes.STRING,
            defaultValue: 'USD'
        },
        billingCycle: {
            type: DataTypes.ENUM('monthly', 'yearly', 'lifetime', 'custom'),
            defaultValue: 'monthly'
        },
        
        // Limits
        dailyLimit: {
            type: DataTypes.INTEGER,
            defaultValue: 100
        },
        monthlyLimit: {
            type: DataTypes.INTEGER,
            defaultValue: 3000
        },
        totalCredits: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'For credit-based plans'
        },
        
        // Features
        features: {
            type: DataTypes.JSON,
            defaultValue: {
                bulkSend: true,
                campaigns: true,
                templates: true,
                apiAccess: false,
                webhooks: false,
                autoReply: false,
                scheduling: false,
                officialApi: false,
                proxy: false,
                analytics: true,
                export: true,
                multiDevice: false,
                prioritySupport: false
            }
        },
        
        // Restrictions
        maxContacts: {
            type: DataTypes.INTEGER,
            defaultValue: 1000
        },
        maxGroups: {
            type: DataTypes.INTEGER,
            defaultValue: 10
        },
        maxTemplates: {
            type: DataTypes.INTEGER,
            defaultValue: 10
        },
        maxCampaigns: {
            type: DataTypes.INTEGER,
            defaultValue: 5
        },
        maxApiKeys: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        maxWebhooks: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        
        // Status
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        isDefault: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        isFeatured: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        
        // Display
        sortOrder: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        color: {
            type: DataTypes.STRING,
            defaultValue: '#3498db'
        },
        icon: DataTypes.STRING
    }, {
        timestamps: true
    });

    return Plan;
};
