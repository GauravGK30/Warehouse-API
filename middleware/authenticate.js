
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");

const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Authentication required."
        });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
        return res.status(401).json({
            error: "Authentication required."
        });
    }

    try {
        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET,
            {
                issuer: "warehouse-api",
                audience: "warehouse-clients",
                algorithms: ["HS256"]
            }
        );

        const userId = Number(payload.sub);
        const warehouseId = Number(payload.warehouseId);

        if (
            !Number.isSafeInteger(userId) ||
            userId <= 0 ||
            !Number.isSafeInteger(warehouseId) ||
            warehouseId <= 0 ||
            !["admin", "manager", "staff"].includes(payload.role)
        ) {
            return res.status(401).json({
                error: "Invalid token."
            });
        }

        // Verify the current database account and warehouse status.
        const user = await userModel.findById(userId);

        if (
            !user ||
            !user.is_active ||
            user.warehouse_status !== "active" ||
            Number(user.warehouse_id) !== warehouseId
        ) {
            return res.status(401).json({
                error: "Account is unavailable."
            });
        }

        req.user = {
            id: user.id,
            warehouseId: user.warehouse_id,
            role: user.role,
            isOwner: Boolean(user.is_owner)
        };

        next();

    } catch (err) {
        if (
            err.name === "JsonWebTokenError" ||
            err.name === "TokenExpiredError"
        ) {
            return res.status(401).json({
                error: "Invalid or expired token."
            });
        }

        next(err);
    }
};

module.exports = authenticate;
