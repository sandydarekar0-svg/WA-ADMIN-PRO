module.exports = (sequelize, DataTypes) => {
    const ActivityLog = sequelize.define('ActivityLog', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: true
        },
        
        action: {
            type: DataTypes.STRING,
            allowNull: false
        },
        category: {
            type: DataTypes.STRING,
            defaultValue: 'general'
        },
        description: DataTypes.TEXT,
        
        // Target
        targetType: DataTypes.STRING,
        targetId: DataTypes.STRING,
        
        // Request Info
        ip: DataTypes.STRING,
        userAgent: DataTypes.STRING,
        
        // Data
        oldData: DataTypes.JSON,
        newData: DataTypes.JSON,
        metadata: DataTypes.JSON,
        
        // Status
        status: {
            type: DataTypes.ENUM('success', 'failed', 'warning'),
            defaultValue: 'success'
        }
    }, {
        timestamps: true,
        indexes: [
            { fields: ['userId'] },
            { fields: ['action'] },
            { fields: ['createdAt'] }
        ]
    });

    return ActivityLog;
};
