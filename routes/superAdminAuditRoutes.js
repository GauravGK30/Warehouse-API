
const express = require("express");

const superAdminAuthenticate = require("../middleware/superAdminAuthenticate");
const superAdminAuditController = require("../controllers/superAdminAuditController");

const router = express.Router();

router.use(superAdminAuthenticate);

router.get("/", superAdminAuditController.getAuditLogs);

module.exports = router;
