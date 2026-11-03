
const db = require("../db/db");

const userModel = {
    // Generate the next employee code for a warehouse.
    // Call this inside an active transaction.
    async getNextEmployeeCode(connection, warehouseId) {
        // Lock this warehouse row to prevent concurrent duplicate codes.
        const [warehouseRows] = await connection.query(
            `SELECT id FROM warehouses
             WHERE id = ?
             FOR UPDATE`,
            [warehouseId]
        );

        if (warehouseRows.length === 0) {
            throw new Error("Warehouse not found.");
        }

        const [rows] = await connection.query(
            `SELECT COALESCE(
                MAX(CAST(employee_code AS UNSIGNED)), 0
             ) AS lastCode
             FROM users
             WHERE warehouse_id = ?`,
            [warehouseId]
        );

        const nextCode = Number(rows[0].lastCode) + 1;

        if (nextCode > 9999) {
            throw new Error(
                "Employee code limit reached for this warehouse."
            );
        }

        return String(nextCode).padStart(4, "0");
    },

    async create({ name, email, passwordHash, warehouseId, role = "staff" }) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const employeeCode = await this.getNextEmployeeCode(
                connection,
                warehouseId
            );

            const [result] = await connection.query(
                `INSERT INTO users
                    (name, email, password_hash, warehouse_id, role, employee_code)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [name, email, passwordHash, warehouseId, role, employeeCode]
            );

            await connection.commit();

            return this.findById(result.insertId);
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    async findByEmail(email) {
        const [rows] = await db.query(
            `SELECT id, name, email, password_hash,
                    role, is_active, warehouse_id, employee_code, created_at
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
                    warehouse_id, employee_code, created_at
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
                    warehouse_id, employee_code, created_at
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
