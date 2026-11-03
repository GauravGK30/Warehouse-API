
const bcrypt = require("bcrypt");
const superAdminWarehouseModel = require("../models/superAdminWarehouseModel");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const listWarehouses = async (req, res, next) => {
    try {
        const warehouses = await superAdminWarehouseModel.list();

        return res.status(200).json({
            count: warehouses.length,
            warehouses
        });
    } catch (err) {
        next(err);
    }
};

const createWarehouse = async (req, res, next) => {
    try {
        const warehouseName =
            typeof req.body.warehouseName === "string"
                ? req.body.warehouseName.trim()
                : "";

        const ownerName =
            typeof req.body.ownerName === "string"
                ? req.body.ownerName.trim()
                : "";

        const ownerEmail =
            typeof req.body.ownerEmail === "string"
                ? req.body.ownerEmail.trim().toLowerCase()
                : "";

        const password = req.body.password;

        if (
            !warehouseName ||
            warehouseName.length > 150 ||
            !ownerName ||
            ownerName.length > 100 ||
            !EMAIL_REGEX.test(ownerEmail) ||
            ownerEmail.length > 255 ||
            typeof password !== "string" ||
            password.length < 8 ||
            Buffer.byteLength(password, "utf8") > 72
        ) {
            return res.status(400).json({
                error: "Enter valid warehouse name, owner name, email and password (8-72 UTF-8 bytes)."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const warehouse = await superAdminWarehouseModel.create({
            warehouseName,
            ownerName,
            ownerEmail,
            passwordHash,
            createdBy: req.superAdmin.id
        });

        return res.status(201).json({
            message: "Warehouse created successfully.",
            warehouse
        });

    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                error: "An account with this email already exists."
            });
        }

        next(err);
    }
};

const updateWarehouseStatus = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body;

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                error: "Invalid warehouse ID."
            });
        }

        if (!["active", "inactive"].includes(status)) {
            return res.status(400).json({
                error: "Status must be active or inactive."
            });
        }

        const warehouse = await superAdminWarehouseModel.updateStatus(
            id,
            status,
            req.superAdmin.id
        );

        if (!warehouse) {
            return res.status(404).json({
                error: "Warehouse not found or already deleted."
            });
        }

        return res.status(200).json({
            message: `Warehouse ${status === "active" ? "reactivated" : "deactivated"} successfully.`,
            warehouse
        });

    } catch (err) {
        next(err);
    }
};

const deleteWarehouse = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                error: "Invalid warehouse ID."
            });
        }

        const deleted = await superAdminWarehouseModel.softDelete(
            id,
            req.superAdmin.id
        );

        if (!deleted) {
            return res.status(404).json({
                error: "Warehouse not found or already deleted."
            });
        }

        return res.status(200).json({
            message: "Warehouse deleted successfully."
        });

    } catch (err) {
        next(err);
    }
};

module.exports = {
    listWarehouses,
    createWarehouse,
    updateWarehouseStatus,
    deleteWarehouse
};
