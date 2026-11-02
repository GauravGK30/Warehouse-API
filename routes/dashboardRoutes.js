const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

router.use(authenticate);

// All warehouse roles can view their dashboard
router.get(
    "/summary",
    authorize("admin", "manager", "staff"),
    dashboardController.getDashboardSummary
);

router.get(
    "/recent-activity",
    authorize("admin", "manager", "staff"),
    dashboardController.getRecentActivity
);

module.exports = router;