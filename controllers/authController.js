
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db/db");
const userModel = require("../models/userModel");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const register = async (req, res, next) => {
    const connection = await db.getConnection();

    try {
        const name =
            typeof req.body.name === "string"
                ? req.body.name.trim()
                : "";

        const warehouseName =
            typeof req.body.warehouseName === "string"
                ? req.body.warehouseName.trim()
                : "";

        const email =
            typeof req.body.email === "string"
                ? req.body.email.trim().toLowerCase()
                : "";

        const password = req.body.password;

        if (
            !name ||
            name.length > 100 ||
            !warehouseName ||
            warehouseName.length > 150 ||
            !EMAIL_REGEX.test(email) ||
            email.length > 255 ||
            typeof password !== "string" ||
            password.length < 8 ||
            Buffer.byteLength(password, "utf8") > 72
        ) {
            return res.status(400).json({
                error: "Enter a valid name, warehouse name, email and password (8-72 UTF-8 bytes)."
            });
        }

        const existingUser = await userModel.findByEmail(email);

        if (existingUser) {
            return res.status(409).json({
                error: "An account with this email already exists."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        await connection.beginTransaction();

        const [warehouseResult] = await connection.query(
            "INSERT INTO warehouses (name) VALUES (?)",
            [warehouseName]
        );

        const warehouseId = warehouseResult.insertId;

        const [userResult] = await connection.query(
            `INSERT INTO users
                (name, email, password_hash, role, warehouse_id)
             VALUES (?, ?, ?, 'admin', ?)`,
            [name, email, passwordHash, warehouseId]
        );

        await connection.commit();

        const user = await userModel.findById(userResult.insertId);

        return res.status(201).json({
            message: "Warehouse registered successfully.",
            user
        });
    } catch (err) {
        await connection.rollback();

        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                error: "An account with this email already exists."
            });
        }

        return next(err);
    } finally {
        connection.release();
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

        if (!user.warehouse_id) {
            return res.status(403).json({
                error: "Your account is not assigned to a warehouse."
            });
        }

        const token = jwt.sign(
            {
                role: user.role,
                warehouseId: user.warehouse_id
            },
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
                role: user.role,
                warehouse_id: user.warehouse_id
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
