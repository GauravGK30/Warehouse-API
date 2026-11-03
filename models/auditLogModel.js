
const db = require("../db/db");

const auditLogModel = {
    async getAuditLogs(warehouseId) {
        const [rows] = await db.query(
            `SELECT
                id,
                user_id,
                employee_code,
                employee_name,
                employee_role,
                action,
                entity_type,
                entity_id,
                entity_label,
                details,
                created_at
            FROM audit_logs
            WHERE warehouse_id = ?
            ORDER BY created_at DESC
            LIMIT 100`,
            [warehouseId]
        );

        return rows;
    }
};

module.exports = auditLogModel;
