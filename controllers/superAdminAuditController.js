
const db = require("../db/db");

const getAuditLogs = async (req, res, next) => {
    try {
        const page = Number(req.query.page || 1);
        const limit = Number(req.query.limit || 20);

        if (
            !Number.isSafeInteger(page) ||
            page < 1 ||
            !Number.isSafeInteger(limit) ||
            limit < 1 ||
            limit > 100
        ) {
            return res.status(400).json({
                error: "Page must be positive and limit must be between 1 and 100."
            });
        }

        const offset = (page - 1) * limit;

        const [countRows] = await db.query(
            `SELECT COUNT(*) AS total
             FROM super_admin_audit_logs`
        );

        const [logs] = await db.query(
            `SELECT
                l.id,
                l.super_admin_id,
                sa.name AS super_admin_name,
                l.warehouse_id,
                l.action,
                l.entity_type,
                l.entity_id,
                l.entity_label,
                l.details,
                l.created_at
             FROM super_admin_audit_logs l
             INNER JOIN super_admins sa
                ON sa.id = l.super_admin_id
             ORDER BY l.id DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        return res.status(200).json({
            total: countRows[0].total,
            page,
            limit,
            totalPages: Math.ceil(countRows[0].total / limit),
            logs
        });

    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAuditLogs
};
