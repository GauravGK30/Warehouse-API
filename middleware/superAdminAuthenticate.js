
const jwt = require("jsonwebtoken");
const db = require("../db/db");

const superAdminAuthenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Super Admin authentication required."
        });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
        return res.status(401).json({
            error: "Super Admin authentication required."
        });
    }

    try {
        if (!process.env.SUPER_ADMIN_JWT_SECRET) {
            throw new Error("Super Admin JWT secret is not configured.");
        }

        const payload = jwt.verify(
            token,
            process.env.SUPER_ADMIN_JWT_SECRET,
            {
                issuer: "warehouse-platform-api",
                audience: "warehouse-super-admin",
                algorithms: ["HS256"]
            }
        );

        const adminId = Number(payload.sub);

        if (!Number.isSafeInteger(adminId) || adminId <= 0) {
            return res.status(401).json({
                error: "Invalid Super Admin token."
            });
        }

        const [rows] = await db.query(
            `SELECT id, name, email, is_active
             FROM super_admins
             WHERE id = ?
             LIMIT 1`,
            [adminId]
        );

        const admin = rows[0];

        if (!admin || !admin.is_active) {
            return res.status(401).json({
                error: "Super Admin account is unavailable."
            });
        }

        req.superAdmin = {
            id: admin.id,
            name: admin.name,
            email: admin.email
        };

        next();

    } catch (err) {
        if (err.name === "JsonWebTokenError" ||
            err.name === "TokenExpiredError") {
            return res.status(401).json({
                error: "Invalid or expired Super Admin token."
            });
        }

        next(err);
    }
};

module.exports = superAdminAuthenticate;
