
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const register = async (req, res, next) => {
    try {
        const name =
            typeof req.body.name === "string"
                ? req.body.name.trim()
                : "";

        const email =
            typeof req.body.email === "string"
                ? req.body.email.trim().toLowerCase()
                : "";

        const password = req.body.password;

        if (
            !name ||
            name.length > 100 ||
            !EMAIL_REGEX.test(email) ||
            email.length > 255 ||
            typeof password !== "string" ||
            password.length < 8 ||
            Buffer.byteLength(password, "utf8") > 72
        ) {
            return res.status(400).json({
                error: "Enter a valid name, email and password (8-72 UTF-8 bytes)."
            });
        }

        const existingUser = await userModel.findByEmail(email);

        if (existingUser) {
            return res.status(409).json({
                error: "An account with this email already exists."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await userModel.create({
            name,
            email,
            passwordHash
        });

        return res.status(201).json({
            message: "Registration successful.",
            user
        });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                error: "An account with this email already exists."
            });
        }

        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const email =
            typeof req.body.email === "string"
                ? req.body.email.trim().toLowerCase()
                : "";

        const password = req.body.password;

        if (
            !email ||
            typeof password !== "string" ||
            !password ||
            Buffer.byteLength(password, "utf8") > 72
        ) {
            return res.status(400).json({
                error: "Email and password are required."
            });
        }

        const user = await userModel.findByEmail(email);

        if (!user || !user.is_active) {
            return res.status(401).json({
                error: "Invalid email or password."
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                error: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            { role: user.role },
            process.env.JWT_SECRET,
            {
                subject: String(user.id),
                expiresIn: "15m",
                issuer: "warehouse-api",
                audience: "warehouse-clients"
            }
        );

        return res.status(200).json({
            message: "Login successful.",
            token,
            expiresIn: 900,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        next(err);
    }
};

const me = async (req, res, next) => {
    try {
        const user = await userModel.findById(req.user.id);

        if (!user || !user.is_active) {
            return res.status(401).json({
                error: "Account is unavailable."
            });
        }

        return res.json({ user });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    register,
    login,
    me
};
