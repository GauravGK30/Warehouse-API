
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db/db");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const login = async (req, res, next) => {
    try {
        const email =
            typeof req.body.email === "string"
                ? req.body.email.trim().toLowerCase()
                : "";

        const password = req.body.password;

        if (
            !EMAIL_REGEX.test(email) ||
            email.length > 255 ||
            typeof password !== "string" ||
            !password ||
            Buffer.byteLength(password, "utf8") > 72
        ) {
            return res.status(400).json({
                error: "Valid email and password are required."
            });
        }

        if (!process.env.SUPER_ADMIN_JWT_SECRET) {
            return next(new Error("Super Admin JWT secret is not configured."));
        }

        const [rows] = await db.query(
            `SELECT id, name, email, password_hash, is_active
             FROM super_admins
             WHERE email = ?
             LIMIT 1`,
            [email]
        );

        const admin = rows[0];

        if (!admin || !admin.is_active) {
            return res.status(401).json({
                error: "Invalid email or password."
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            admin.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                error: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            { type: "super_admin" },
            process.env.SUPER_ADMIN_JWT_SECRET,
            {
                subject: String(admin.id),
                expiresIn: "15m",
                issuer: "warehouse-platform-api",
                audience: "warehouse-super-admin",
                algorithm: "HS256"
            }
        );

        return res.status(200).json({
            message: "Super Admin login successful.",
            token,
            expiresIn: 900,
            superAdmin: {
                id: admin.id,
                name: admin.name,
                email: admin.email
            }
        });

    } catch (err) {
        next(err);
    }
};

const me = (req, res) => {
    return res.status(200).json({
        superAdmin: req.superAdmin
    });
};

module.exports = {
    login,
    me
};
