
const bcrypt = require("bcrypt");
const userModel = require("../models/userModel");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// View users in the same warehouse
const listUsers = async (req, res, next) => {
  try {
    const users = await userModel.list(req.user.warehouseId);

    // Managers can view staff only
    const visibleUsers =
      req.user.role === "manager"
        ? users.filter((user) => user.role === "staff")
        : users;

    res.json({ users: visibleUsers });
  } catch (err) {
    next(err);
  }
};

// Admin creates managers/staff; manager creates staff only
const createUser = async (req, res, next) => {
  try {
    const name =
      typeof req.body.name === "string" ? req.body.name.trim() : "";
    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const password = req.body.password;
    const role = req.body.role;

    const allowedRoles =
      req.user.role === "admin" ? ["manager", "staff"] : ["staff"];

    if (
      !name ||
      name.length > 100 ||
      !EMAIL_REGEX.test(email) ||
      email.length > 255 ||
      typeof password !== "string" ||
      password.length < 8 ||
      Buffer.byteLength(password, "utf8") > 72 ||
      !allowedRoles.includes(role)
    ) {
      return res.status(400).json({
        error:
          req.user.role === "admin"
            ? "Provide valid name, email, password (8-72 UTF-8 bytes), and role (manager or staff)."
            : "Provide valid name, email, password (8-72 UTF-8 bytes), and role staff.",
      });
    }

    const existingUser = await userModel.findByEmail(email);

    if (existingUser) {
      return res.status(409).json({
        error: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await userModel.create({
      name,
      email,
      passwordHash,
      warehouseId: req.user.warehouseId,
      role,
    });

    return res.status(201).json({
      message: "User created successfully.",
      user,
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: "An account with this email already exists.",
      });
    }

    next(err);
  }
};

// Only admins can change roles
const updateRole = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { role } = req.body;

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Invalid user ID." });
    }

    if (!["manager", "staff"].includes(role)) {
      return res.status(400).json({
        error: "Role must be manager or staff.",
      });
    }

    if (userId === req.user.id) {
      return res.status(400).json({
        error: "You cannot change your own role.",
      });
    }

    const target = await userModel.findById(userId);

    if (
      !target ||
      Number(target.warehouse_id) !== Number(req.user.warehouseId)
    ) {
      return res.status(404).json({ error: "User not found." });
    }

    if (target.role === "admin") {
      return res.status(403).json({
        error: "You cannot change another admin's role.",
      });
    }

    if (target.role === role) {
      return res.json({ message: "User already has this role.", user: target });
    }

    const user = await userModel.updateRole(
      userId,
      role,
      req.user.warehouseId
    );

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.json({ message: "User role updated.", user });
  } catch (err) {
    next(err);
  }
};

// Admin manages managers/staff; manager manages staff only
const updateStatus = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { is_active } = req.body;

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Invalid user ID." });
    }

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        error: "is_active must be true or false.",
      });
    }

    if (userId === req.user.id) {
      return res.status(400).json({
        error: "You cannot deactivate or change your own account status.",
      });
    }

    const target = await userModel.findById(userId);

    if (
      !target ||
      Number(target.warehouse_id) !== Number(req.user.warehouseId)
    ) {
      return res.status(404).json({ error: "User not found." });
    }

    if (target.role === "admin") {
      return res.status(403).json({
        error: "You cannot change another admin's account status.",
      });
    }

    if (req.user.role === "manager" && target.role !== "staff") {
      return res.status(403).json({
        error: "Managers can manage staff accounts only.",
      });
    }

    if (Boolean(target.is_active) === is_active) {
      return res.json({ message: "Account status is already set.", user: target });
    }

    const user = await userModel.updateStatus(
      userId,
      is_active,
      req.user.warehouseId
    );

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.json({
      message: is_active
        ? "User activated successfully."
        : "User deactivated successfully.",
      user,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listUsers,
  createUser,
  updateRole,
  updateStatus,
};
