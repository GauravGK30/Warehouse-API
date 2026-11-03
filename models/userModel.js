
const db = require("../db/db");
const logAudit = require("../utils/auditLogger");

const userModel = {
    async getNextEmployeeCode(connection, warehouseId) {
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

    async create({
        name,
        email,
        passwordHash,
        warehouseId,
        role = "staff",
        createdBy
    }) {
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

            await logAudit(connection, {
                warehouseId,
                userId: createdBy,
                action: "CREATE",
                entityType: "USER",
                entityId: result.insertId,
                entityLabel: `${name} (${employeeCode})`,
                details: {
                    name,
                    email,
                    employee_code: employeeCode,
                    role
                }
            });

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
                    role, is_active, is_owner, warehouse_id,
                    employee_code, created_at
             FROM users
             WHERE email = ?
             LIMIT 1`,
            [email]
        );

        return rows[0] || null;
    },

    async findByWarehouseCodeAndEmail(warehouseCode, email) {
        const [rows] = await db.query(
            `SELECT
                u.id, u.name, u.email, u.password_hash,
                u.role, u.is_active, u.is_owner,
                u.warehouse_id, u.employee_code, u.created_at,
                w.warehouse_code
             FROM users u
             INNER JOIN warehouses w ON w.id = u.warehouse_id
             WHERE w.warehouse_code = ? AND u.email = ?
             LIMIT 1`,
            [warehouseCode, email]
        );

        return rows[0] || null;
    },

    async findById(id) {
        const [rows] = await db.query(
            `SELECT id, name, email, role, is_active, is_owner,
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
            `SELECT id, name, email, role, is_active, is_owner,
                    warehouse_id, employee_code, created_at
             FROM users
             WHERE warehouse_id = ?
             ORDER BY id DESC`,
            [warehouseId]
        );

        return rows;
    },

    async updateRole(id, role, warehouseId, updatedBy) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [rows] = await connection.query(
                `SELECT id, name, employee_code, role, is_owner
                 FROM users
                 WHERE id = ? AND warehouse_id = ?
                 FOR UPDATE`,
                [id, warehouseId]
            );

            if (rows.length === 0) {
                await connection.rollback();
                return null;
            }

            const target = rows[0];

            if (Boolean(target.is_owner)) {
                throw new Error("The warehouse owner's role cannot be changed.");
            }

            const previousRole = target.role;

            if (previousRole === role) {
                await connection.commit();
                return this.findById(id);
            }

            await connection.query(
                `UPDATE users
                 SET role = ?
                 WHERE id = ? AND warehouse_id = ?`,
                [role, id, warehouseId]
            );

            await logAudit(connection, {
                warehouseId,
                userId: updatedBy,
                action: "UPDATE",
                entityType: "USER",
                entityId: id,
                entityLabel: `${target.name} (${target.employee_code})`,
                details: {
                    field: "role",
                    previous_value: previousRole,
                    new_value: role
                }
            });

            await connection.commit();

            return this.findById(id);
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    async updateStatus(id, isActive, warehouseId, updatedBy) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [rows] = await connection.query(
                `SELECT id, name, employee_code, role, is_owner, is_active
                 FROM users
                 WHERE id = ? AND warehouse_id = ?
                 FOR UPDATE`,
                [id, warehouseId]
            );

            if (rows.length === 0) {
                await connection.rollback();
                return null;
            }

            const target = rows[0];

            if (Boolean(target.is_owner)) {
                throw new Error("The warehouse owner's account status cannot be changed.");
            }

            const previousStatus = Boolean(target.is_active);

            if (previousStatus === isActive) {
                await connection.commit();
                return this.findById(id);
            }

            await connection.query(
                `UPDATE users
                 SET is_active = ?
                 WHERE id = ? AND warehouse_id = ?`,
                [isActive, id, warehouseId]
            );

            await logAudit(connection, {
                warehouseId,
                userId: updatedBy,
                action: "UPDATE",
                entityType: "USER",
                entityId: id,
                entityLabel: `${target.name} (${target.employee_code})`,
                details: {
                    field: "is_active",
                    previous_value: previousStatus,
                    new_value: isActive
                }
            });

            await connection.commit();

            return this.findById(id);
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    }
};

module.exports = userModel;
