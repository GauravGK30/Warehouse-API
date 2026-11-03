
const logAudit = async (
    connection,
    {
        warehouseId,
        userId,
        action,
        entityType,
        entityId,
        entityLabel,
        details
    }
) => {
    // Get authenticated employee details from the database
    const [users] = await connection.query(
        `SELECT name, employee_code, role
         FROM users
         WHERE id = ? AND warehouse_id = ?
         LIMIT 1`,
        [userId, warehouseId]
    );

    if (users.length === 0) {
        throw new Error("Audit employee not found");
    }

    const employee = users[0];

    // Save audit record
    await connection.query(
        `INSERT INTO audit_logs (
            warehouse_id,
            user_id,
            employee_code,
            employee_name,
            employee_role,
            action,
            entity_type,
            entity_id,
            entity_label,
            details
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            warehouseId,
            userId,
            employee.employee_code,
            employee.name,
            employee.role,
            action,
            entityType,
            entityId,
            entityLabel,
            details ? JSON.stringify(details) : null
        ]
    );
};

module.exports = logAudit;
