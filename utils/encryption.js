const crypto = require('crypto');
const secret = process.env.ENCRYPTION_KEY || 'default_secret_32_chars_long!!';

const encrypt = (text) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-ctr', Buffer.from(secret), iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

module.exports = { encrypt };
