module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        parentId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'For reseller hierarchy'
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: true
        },
        role: {
            type: DataTypes.ENUM('superadmin', 'admin', 'reseller', 'user'),
            defaultValue: 'user'
        },
        planId: {
            type: DataTypes.UUID,
            allowNull: true
        },
        
        // Credits & Limits
        credits: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        creditsUsed: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        dailyLimit: {
            type: DataTypes.INTEGER,
            defaultValue: 100
        },
        monthlyLimit: {
            type: DataTypes.INTEGER,
            defaultValue: 3000
        },
        messagesUsedToday: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        messagesUsedMonth: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        totalMessagesSent: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        
        // WhatsApp Connection
        whatsappConnected: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        whatsappNumber: {
            type: DataTypes.STRING,
            allowNull: true
        },
        connectionType: {
            type: DataTypes.ENUM('personal', 'official'),
            defaultValue: 'personal'
        },
        
        // Official API Settings
        metaAccessToken: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        metaPhoneNumberId: {
            type: DataTypes.STRING,
            allowNull: true
        },
        metaBusinessId: {
            type: DataTypes.STRING,
            allowNull: true
        },
        
        // Status
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        isVerified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        isBanned: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        banReason: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        
        // Two Factor Auth
        twoFactorEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        twoFactorSecret: {
            type: DataTypes.STRING,
            allowNull: true
        },
        
        // Reseller Specific
        canCreateUsers: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        maxSubUsers: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        commissionRate: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0
        },
        
        // Settings
        settings: {
            type: DataTypes.JSON,
            defaultValue: {
                minDelay: 3000,
                maxDelay: 8000,
                batchSize: 50,
                timezone: 'UTC',
                notifications: true,
                autoReplyEnabled: false
            }
        },
        
        // Metadata
        lastLogin: DataTypes.DATE,
        lastActivity: DataTypes.DATE,
        loginIp: DataTypes.STRING,
        expiresAt: DataTypes.DATE,
        
        // Profile
        avatar: DataTypes.STRING,
        company: DataTypes.STRING,
        address: DataTypes.TEXT,
        notes: DataTypes.TEXT
    }, {
        timestamps: true,
        paranoid: true, // Soft delete
        indexes: [
            { fields: ['email'] },
            { fields: ['role'] },
            { fields: ['parentId'] },
            { fields: ['isActive'] }
        ]
    });

    return User;
};
