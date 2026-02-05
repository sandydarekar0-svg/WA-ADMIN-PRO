const adminMiddleware = async (req, res, next) => {
    const allowedRoles = ['superadmin', 'admin', 'reseller'];
    
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    
    next();
};

const superAdminMiddleware = async (req, res, next) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Access denied. Super admin privileges required.' });
    }
    
    next();
};

module.exports = { adminMiddleware, superAdminMiddleware };
