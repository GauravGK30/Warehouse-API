
const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

router.use(authenticate);

// Admin and manager can view users and create permitted accounts
router.get(
  "/",
  authorize("admin", "manager"),
  userController.listUsers
);

router.post(
  "/",
  authorize("admin", "manager"),
  userController.createUser
);

// Only admin can change user roles
router.patch(
  "/:id/role",
  authorize("admin"),
  userController.updateRole
);

// Admin and manager can update account status,
// with additional role checks in the controller
router.patch(
  "/:id/status",
  authorize("admin", "manager"),
  userController.updateStatus
);

module.exports = router;
