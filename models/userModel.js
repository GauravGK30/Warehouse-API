
const db = require("../db/db");

const userModel = {
    async create({ name, email, passwordHash }) {
        const [result] = await db.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES (?, ?, ?)`,
            [name, email, passwordHash]
        );

        return this.findById(result.insertId);
    },

    async findByEmail(email) {
        const [rows] = await db.query(
            `SELECT id, name, email, password_hash,
                    role, is_active, created_at
             FROM users
             WHERE email = ?
             LIMIT 1`,
            [email]
        );

        return rows[0] || null;
    },

    async findById(id) {
        const [rows] = await db.query(
            `SELECT id, name, email, role, is_active, created_at
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [id]
        );

        return rows[0] || null;
    },

    async list() {
        const [rows] = await db.query(
            `SELECT id, name, email, role, is_active, created_at
             FROM users
             ORDER BY id DESC`
        );

        return rows;
    },

    async updateRole(id, role) {
        const [result] = await db.query(
            "UPDATE users SET role = ? WHERE id = ?",
            [role, id]
        );

        if (result.affectedRows === 0) {
            return null;
        }

        return this.findById(id);
    },

    async updateStatus(id, isActive) {
        const [result] = await db.query(
            "UPDATE users SET is_active = ? WHERE id = ?",
            [isActive, id]
        );

        if (result.affectedRows === 0) {
            return null;
        }

        return this.findById(id);
    }
};

module.exports = userModel;
