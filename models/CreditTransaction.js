module.exports = (sequelize, DataTypes) => {
    const CreditTransaction = sequelize.define('CreditTransaction', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        addedBy: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'Admin who added credits'
        },
        
        type: {
            type: DataTypes.ENUM(
                'purchase', 'admin_add', 'admin_deduct', 
                'usage', 'refund', 'bonus', 'transfer', 'expiry'
            ),
            allowNull: false
        },
        
        amount: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        balanceBefore: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        balanceAfter: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        
        description: DataTypes.STRING,
        reference: DataTypes.STRING,
        
        // For purchases
        paymentMethod: DataTypes.STRING,
        paymentId: DataTypes.STRING,
        price: DataTypes.DECIMAL(10, 2),
        currency: DataTypes.STRING,
        
        metadata: {
            type: DataTypes.JSON,
            defaultValue: {}
        }
    }, {
        timestamps: true,
        indexes: [
            { fields: ['userId'] },
            { fields: ['type'] }
        ]
    });

    return CreditTransaction;
};
