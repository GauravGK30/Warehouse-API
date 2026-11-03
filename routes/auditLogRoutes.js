
const express = require("express");
const router = express.Router();

const auditLogController = require("../controllers/auditLogController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

// Only admins and managers can view audit logs
router.use(authenticate);

router.get(
    "/",
    authorize("admin", "manager"),
    auditLogController.getAuditLogs
);

module.exports = router;
