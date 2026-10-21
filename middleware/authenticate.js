
const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
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

        req.user = {
            id: userId,
            role: payload.role,
            warehouseId
        };

        next();
    } catch (err) {
        return res.status(401).json({
            error: "Invalid or expired token."
        });
    }
};

module.exports = authenticate;
