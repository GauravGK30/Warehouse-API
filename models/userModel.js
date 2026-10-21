
const db = require("../db/db");

const userModel = {
    async create({ name, email, passwordHash, warehouseId, role = "staff" }) {
        const [result] = await db.query(
            `INSERT INTO users
                (name, email, password_hash, warehouse_id, role)
             VALUES (?, ?, ?, ?, ?)`,
            [name, email, passwordHash, warehouseId, role]
        );

        return this.findById(result.insertId);
    },

    async findByEmail(email) {
        const [rows] = await db.query(
            `SELECT id, name, email, password_hash,
                    role, is_active, warehouse_id, created_at
             FROM users
             WHERE email = ?
             LIMIT 1`,
            [email]
        );

        return rows[0] || null;
    },

    async findById(id) {
        const [rows] = await db.query(
            `SELECT id, name, email, role, is_active,
                    warehouse_id, created_at
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [id]
        );

        return rows[0] || null;
    },

    async list(warehouseId) {
        const [rows] = await db.query(
            `SELECT id, name, email, role, is_active,
                    warehouse_id, created_at
             FROM users
             WHERE warehouse_id = ?
             ORDER BY id DESC`,
            [warehouseId]
        );

        return rows;
    },

    async updateRole(id, role, warehouseId) {
        const [result] = await db.query(
            `UPDATE users
             SET role = ?
             WHERE id = ? AND warehouse_id = ?`,
            [role, id, warehouseId]
        );

        if (result.affectedRows === 0) {
            return null;
        }

        return this.findById(id);
    },

    async updateStatus(id, isActive, warehouseId) {
        const [result] = await db.query(
            `UPDATE users
             SET is_active = ?
             WHERE id = ? AND warehouse_id = ?`,
            [isActive, id, warehouseId]
        );

        if (result.affectedRows === 0) {
            return null;
        }

        return this.findById(id);
    }
};

module.exports = userModel;
