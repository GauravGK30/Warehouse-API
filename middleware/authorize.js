
const userModel = require("../models/userModel");

const authorize = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            const user = await userModel.findById(req.user.id);

            if (!user || !user.is_active) {
                return res.status(401).json({
                    error: "Account is unavailable."
                });
            }

            // Use the current database role, not a possibly
            // outdated role embedded in the token.
            req.user.role = user.role;

            if (!allowedRoles.includes(user.role)) {
                return res.status(403).json({
                    error: "You do not have permission to perform this action."
                });
            }

            next();
        } catch (err) {
            next(err);
        }
    };
};

module.exports = authorize;
