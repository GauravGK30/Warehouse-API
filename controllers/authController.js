
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db/db");
const crypto = require("crypto");
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

        const warehouseCode = crypto
            .randomBytes(5)
            .toString("hex")
            .toUpperCase();

        const [warehouseResult] = await connection.query(
            `INSERT INTO warehouses (name, warehouse_code)
            VALUES (?, ?)`,
            [warehouseName, warehouseCode]
        );

        const warehouseId = warehouseResult.insertId;

        const employeeCode = await userModel.getNextEmployeeCode(
            connection,
            warehouseId
        );

        const [userResult] = await connection.query(
            `INSERT INTO users
                (name, email, password_hash, role, warehouse_id,employee_code, is_owner)
                VALUES (?, ?, ?, 'admin', ?, ?, 1)`,
            [name, email, passwordHash, warehouseId, employeeCode]
        );

        await connection.commit();

        const user = await userModel.findById(userResult.insertId);

        return res.status(201).json({
            message: "Warehouse registered successfully.",
            warehouse: {
                id: warehouseId,
                name: warehouseName,
                warehouse_code: warehouseCode
            },
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
        const warehouseCode =
            typeof req.body.warehouseCode === "string"
                ? req.body.warehouseCode.trim().toUpperCase()
                : "";

        const email =
            typeof req.body.email === "string"
                ? req.body.email.trim().toLowerCase()
                : "";

        const password = req.body.password;

        if (
            !/^[A-F0-9]{10}$/.test(warehouseCode) ||
            !EMAIL_REGEX.test(email) ||
            typeof password !== "string" ||
            !password ||
            Buffer.byteLength(password, "utf8") > 72
        ) {
            return res.status(400).json({
                error: "Valid Warehouse ID, email and password are required."
            });
        }

        const user = await userModel.findByWarehouseCodeAndEmail(
            warehouseCode,
            email
        );

        if (!user || !user.is_active) {
            return res.status(401).json({
                error: "Invalid Warehouse ID, email or password."
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                error: "Invalid Warehouse ID, email or password."
            });
        }

        const token = jwt.sign(
            {
                role: user.role,
                warehouseId: user.warehouse_id,
                isOwner: Boolean(user.is_owner)
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
                is_owner: Boolean(user.is_owner),
                warehouse_id: user.warehouse_id,
                warehouse_code: user.warehouse_code
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
