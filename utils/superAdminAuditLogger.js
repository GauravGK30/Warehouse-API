
async function logSuperAdminAudit(connection, {
    superAdminId,
    warehouseId = null,
    action,
    entityType,
    entityId,
    entityLabel,
    details = {}
}) {
    const allowedActions = ["CREATE", "UPDATE", "DELETE"];

    if (!allowedActions.includes(action)) {
        throw new Error("Invalid platform audit action.");
    }

    await connection.query(
        `INSERT INTO super_admin_audit_logs
            (
                super_admin_id,
                warehouse_id,
                action,
                entity_type,
                entity_id,
                entity_label,
                details
            )
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            superAdminId,
            warehouseId,
            action,
            entityType,
            entityId,
            entityLabel,
            JSON.stringify(details)
        ]
    );
}

module.exports = logSuperAdminAudit;
