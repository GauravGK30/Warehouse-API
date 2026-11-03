
const express = require("express");

const superAdminAuthenticate = require("../middleware/superAdminAuthenticate");
const superAdminWarehouseController = require("../controllers/superAdminWarehouseController");

const router = express.Router();

// All warehouse-management routes require Super Admin authentication.
router.use(superAdminAuthenticate);

router.get("/", superAdminWarehouseController.listWarehouses);

router.post("/", superAdminWarehouseController.createWarehouse);

router.patch(
    "/:id/status",
    superAdminWarehouseController.updateWarehouseStatus
);

router.delete(
    "/:id",
    superAdminWarehouseController.deleteWarehouse
);

module.exports = router;
