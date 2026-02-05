const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const db = require('../models');

class ProxyService {
    static async getProxy(userId = null) {
        const where = { isActive: true };
        
        if (userId) {
            where[db.Sequelize.Op.or] = [
                { userId },
                { isGlobal: true }
            ];
        } else {
            where.isGlobal = true;
        }

        const proxies = await db.ProxyConfig.findAll({
            where,
            order: [
                ['priority', 'ASC'],
                ['failCount', 'ASC'],
                ['usageCount', 'ASC']
            ]
        });

        if (proxies.length === 0) return null;

        // Get the best proxy (least used, least failed)
        const proxy = proxies[0];

        // Update usage count
        await proxy.update({
            usageCount: proxy.usageCount + 1
        });

        return this.createAgent(proxy);
    }

    static createAgent(proxy) {
        let auth = '';
        if (proxy.username && proxy.password) {
            auth = `${proxy.username}:${proxy.password}@`;
        }

        const proxyUrl = `${proxy.type}://${auth}${proxy.host}:${proxy.port}`;

        if (proxy.type === 'socks4' || proxy.type === 'socks5') {
            return new SocksProxyAgent(proxyUrl);
        }

        return new HttpsProxyAgent(proxyUrl);
    }

    static async checkProxy(proxyId) {
        const proxy = await db.ProxyConfig.findByPk(proxyId);
        if (!proxy) throw new Error('Proxy not found');

        const agent = this.createAgent(proxy);

        try {
            const axios = require('axios');
            const response = await axios.get('https://api.ipify.org?format=json', {
                httpsAgent: agent,
                timeout: 10000
            });

            await proxy.update({
                lastChecked: new Date(),
                lastStatus: 'working',
                failCount: 0
            });

            return {
                success: true,
                ip: response.data.ip
            };
        } catch (error) {
            await proxy.update({
                lastChecked: new Date(),
                lastStatus: 'failed',
                failCount: proxy.failCount + 1
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    static async rotateProxy(proxyId) {
        const proxy = await db.ProxyConfig.findByPk(proxyId);
        if (!proxy || !proxy.isRotating || !proxy.rotationUrl) {
            throw new Error('Proxy rotation not available');
        }

        try {
            const axios = require('axios');
            await axios.get(proxy.rotationUrl);
            return { success: true };
        } catch (error) {
            throw new Error(`Rotation failed: ${error.message}`);
        }
    }
}

module.exports = ProxyService;
