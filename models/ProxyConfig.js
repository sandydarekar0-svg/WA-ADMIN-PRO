module.exports = (sequelize, DataTypes) => {
    const ProxyConfig = sequelize.define('ProxyConfig', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'Null for global proxies'
        },
        
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        
        type: {
            type: DataTypes.ENUM('http', 'https', 'socks4', 'socks5'),
            defaultValue: 'http'
        },
        
        host: {
            type: DataTypes.STRING,
            allowNull: false
        },
        port: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        
        username: DataTypes.STRING,
        password: DataTypes.STRING,
        
        // Rotation
        isRotating: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        rotationUrl: DataTypes.STRING,
        
        // Status
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        isGlobal: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        
        // Health
        lastChecked: DataTypes.DATE,
        lastStatus: {
            type: DataTypes.ENUM('unknown', 'working', 'failed'),
            defaultValue: 'unknown'
        },
        failCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        
        // Usage
        usageCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        
        // Priority
        priority: {
            type: DataTypes.INTEGER,
            defaultValue: 5
        }
    }, {
        timestamps: true
    });

    return ProxyConfig;
};
