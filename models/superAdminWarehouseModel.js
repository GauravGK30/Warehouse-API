
const db = require("../db/db");
const crypto = require("crypto");
const logSuperAdminAudit = require("../utils/superAdminAuditLogger");

const superAdminWarehouseModel = {
    async list() {
        const [rows] = await db.query(
            `SELECT
                w.id,
                w.name,
                w.warehouse_code,
                w.status,
                w.created_at,
                u.name AS owner_name,
                u.email AS owner_email
             FROM warehouses w
             LEFT JOIN users u
                ON u.warehouse_id = w.id
                AND u.is_owner = 1
             ORDER BY w.id DESC`
        );

        return rows;
    },

    async create({
        warehouseName,
        ownerName,
        ownerEmail,
        passwordHash,
        createdBy
    }) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            let warehouseResult;
            let warehouseCode;
            let created = false;

            for (let attempt = 0; attempt < 5; attempt++) {
                warehouseCode = crypto
                    .randomBytes(5)
                    .toString("hex")
                    .toUpperCase();

                const [existing] = await connection.query(
                    `SELECT id FROM warehouses
                     WHERE warehouse_code = ?
                     LIMIT 1`,
                    [warehouseCode]
                );

                if (existing.length > 0) {
                    continue;
                }

                [warehouseResult] = await connection.query(
                    `INSERT INTO warehouses (name, warehouse_code)
                     VALUES (?, ?)`,
                    [warehouseName, warehouseCode]
                );

                created = true;
                break;
            }

            if (!created) {
                throw new Error("Unable to generate a unique Warehouse ID.");
            }

            const warehouseId = warehouseResult.insertId;

            await connection.query(
                `INSERT INTO users
                    (name, email, password_hash, role,
                     warehouse_id, employee_code, is_owner)
                 VALUES (?, ?, ?, 'admin', ?, '0001', 1)`,
                [ownerName, ownerEmail, passwordHash, warehouseId]
            );

            await logSuperAdminAudit(connection, {
                superAdminId: createdBy,
                warehouseId,
                action: "CREATE",
                entityType: "WAREHOUSE",
                entityId: warehouseId,
                entityLabel: `${warehouseName} (${warehouseCode})`,
                details: {
                    warehouse_name: warehouseName,
                    warehouse_code: warehouseCode,
                    owner_name: ownerName,
                    owner_email: ownerEmail
                }
            });

            await connection.commit();

            return {
                id: warehouseId,
                name: warehouseName,
                warehouse_code: warehouseCode,
                status: "active",
                owner_name: ownerName,
                owner_email: ownerEmail
            };

        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    async updateStatus(id, status, updatedBy) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [rows] = await connection.query(
                `SELECT id, name, warehouse_code, status
                 FROM warehouses
                 WHERE id = ?
                 FOR UPDATE`,
                [id]
            );

            if (rows.length === 0 || rows[0].status === "deleted") {
                await connection.rollback();
                return null;
            }

            const warehouse = rows[0];
            const previousStatus = warehouse.status;

            if (previousStatus === status) {
                await connection.commit();
                return warehouse;
            }

            await connection.query(
                `UPDATE warehouses
                 SET status = ?
                 WHERE id = ?`,
                [status, id]
            );

            await logSuperAdminAudit(connection, {
                superAdminId: updatedBy,
                warehouseId: id,
                action: "UPDATE",
                entityType: "WAREHOUSE",
                entityId: id,
                entityLabel: `${warehouse.name} (${warehouse.warehouse_code})`,
                details: {
                    field: "status",
                    previous_value: previousStatus,
                    new_value: status
                }
            });

            await connection.commit();

            return {
                ...warehouse,
                status
            };

        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    async softDelete(id, deletedBy) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [rows] = await connection.query(
                `SELECT id, name, warehouse_code, status
                 FROM warehouses
                 WHERE id = ?
                 FOR UPDATE`,
                [id]
            );

            if (rows.length === 0 || rows[0].status === "deleted") {
                await connection.rollback();
                return false;
            }

            const warehouse = rows[0];

            await connection.query(
                `UPDATE warehouses
                 SET status = 'deleted'
                 WHERE id = ?`,
                [id]
            );

            await logSuperAdminAudit(connection, {
                superAdminId: deletedBy,
                warehouseId: id,
                action: "DELETE",
                entityType: "WAREHOUSE",
                entityId: id,
                entityLabel: `${warehouse.name} (${warehouse.warehouse_code})`,
                details: {
                    warehouse_name: warehouse.name,
                    warehouse_code: warehouse.warehouse_code,
                    previous_status: warehouse.status,
                    new_status: "deleted"
                }
            });

            await connection.commit();

            return true;

        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    }
};

module.exports = superAdminWarehouseModel;
