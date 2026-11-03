
const auditLogModel = require("../models/auditLogModel");

const getAuditLogs = async (req, res) => {
    try {
        const warehouseId = req.user.warehouseId;

        const logs = await auditLogModel.getAuditLogs(warehouseId);

        return res.status(200).json({
            count: logs.length,
            auditLogs: logs
        });

    } catch (err) {
        console.error("getAuditLogs:", err);

        return res.status(500).json({
            error: "Failed to fetch audit logs"
        });
    }
};

module.exports = {
    getAuditLogs
};
