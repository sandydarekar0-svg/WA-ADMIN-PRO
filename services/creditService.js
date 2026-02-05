const db = require('../models');

class CreditService {
    static async addCredits(userId, amount, type, description, addedBy = null) {
        const user = await db.User.findByPk(userId);
        if (!user) throw new Error('User not found');

        const balanceBefore = user.credits;
        const balanceAfter = balanceBefore + amount;

        await user.update({ credits: balanceAfter });

        await db.CreditTransaction.create({
            userId,
            addedBy,
            type,
            amount,
            balanceBefore,
            balanceAfter,
            description
        });

        return { balanceBefore, balanceAfter };
    }

    static async deductCredits(userId, amount, description) {
        const user = await db.User.findByPk(userId);
        if (!user) throw new Error('User not found');

        const available = user.credits - user.creditsUsed;
        if (available < amount) {
            throw new Error('Insufficient credits');
        }

        const balanceBefore = user.creditsUsed;
        const balanceAfter = balanceBefore + amount;

        await user.update({ creditsUsed: balanceAfter });

        await db.CreditTransaction.create({
            userId,
            type: 'usage',
            amount: -amount,
            balanceBefore,
            balanceAfter,
            description
        });

        return { creditsRemaining: user.credits - balanceAfter };
    }

    static async getBalance(userId) {
        const user = await db.User.findByPk(userId);
        if (!user) throw new Error('User not found');

        return {
            total: user.credits,
            used: user.creditsUsed,
            available: user.credits - user.creditsUsed
        };
    }

    static async transferCredits(fromUserId, toUserId, amount, description) {
        const fromUser = await db.User.findByPk(fromUserId);
        const toUser = await db.User.findByPk(toUserId);

        if (!fromUser || !toUser) throw new Error('User not found');

        const available = fromUser.credits - fromUser.creditsUsed;
        if (available < amount) {
            throw new Error('Insufficient credits');
        }

        // Deduct from sender
        await fromUser.update({ credits: fromUser.credits - amount });
        await db.CreditTransaction.create({
            userId: fromUserId,
            type: 'transfer',
            amount: -amount,
            balanceBefore: fromUser.credits + amount,
            balanceAfter: fromUser.credits,
            description: `Transfer to ${toUser.email}: ${description}`
        });

        // Add to receiver
        await toUser.update({ credits: toUser.credits + amount });
        await db.CreditTransaction.create({
            userId: toUserId,
            type: 'transfer',
            amount,
            balanceBefore: toUser.credits - amount,
            balanceAfter: toUser.credits,
            description: `Transfer from ${fromUser.email}: ${description}`
        });

        return { success: true };
    }
}

module.exports = CreditService;
