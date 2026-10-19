
const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const userController = require("../controllers/userController");

const router = express.Router();

// Every route in this file requires an authenticated admin.
router.use(authenticate, authorize("admin"));

router.get("/", userController.listUsers);
router.patch("/:id/role", userController.updateRole);
router.patch("/:id/status", userController.updateStatus);

module.exports = router;
