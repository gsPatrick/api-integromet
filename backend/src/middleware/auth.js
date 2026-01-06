module.exports = (req, res, next) => {
    const apiSecret = process.env.API_SECRET;
    const token = req.headers['x-api-token'];

    if (!apiSecret) {
        console.warn('[Auth] API_SECRET not configured on server. Allowing request (UNSAFE).');
        return next();
    }

    if (!token || token !== apiSecret) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Token' });
    }

    next();
};
