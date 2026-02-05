module.exports = (sequelize, DataTypes) => {
    const SystemSettings = sequelize.define('SystemSettings', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        key: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        value: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        type: {
            type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
            defaultValue: 'string'
        },
        category: {
            type: DataTypes.STRING,
            defaultValue: 'general'
        },
        description: DataTypes.STRING,
        isPublic: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        timestamps: true
    });

    return SystemSettings;
};
