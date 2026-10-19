
const userModel = require("../models/userModel");

const listUsers = async (req, res, next) => {
    try {
        const users = await userModel.list();
        return res.json({ users });
    } catch (err) {
        next(err);
    }
};

const updateRole = async (req, res, next) => {
    try {
        const { role } = req.body;
        const userId = Number(req.params.id);

        if (!Number.isSafeInteger(userId) || userId <= 0) {
            return res.status(400).json({
                error: "Invalid user ID."
            });
        }

        if (!["admin", "manager", "staff"].includes(role)) {
            return res.status(400).json({
                error: "Invalid role."
            });
        }

        // Prevent an admin from accidentally removing
        // their own administrative role.
        if (userId === req.user.id && role !== "admin") {
            return res.status(400).json({
                error: "You cannot remove your own admin role."
            });
        }

        const user = await userModel.updateRole(userId, role);

        if (!user) {
            return res.status(404).json({
                error: "User not found."
            });
        }

        return res.json({
            message: "User role updated.",
            user
        });
    } catch (err) {
        next(err);
    }
};

const updateStatus = async (req, res, next) => {
    try {
        const userId = Number(req.params.id);
        const { is_active } = req.body;

        if (!Number.isSafeInteger(userId) || userId <= 0) {
            return res.status(400).json({
                error: "Invalid user ID."
            });
        }

        if (typeof is_active !== "boolean") {
            return res.status(400).json({
                error: "is_active must be true or false."
            });
        }

        if (userId === req.user.id && !is_active) {
            return res.status(400).json({
                error: "You cannot deactivate your own account."
            });
        }

        const user = await userModel.updateStatus(
            userId,
            is_active
        );

        if (!user) {
            return res.status(404).json({
                error: "User not found."
            });
        }

        return res.json({
            message: "User status updated.",
            user
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    listUsers,
    updateRole,
    updateStatus
};
