
const express = require("express");
const superAdminAuthController = require("../controllers/superAdminAuthController");
const superAdminAuthenticate = require("../middleware/superAdminAuthenticate");

const router = express.Router();

router.post("/login", superAdminAuthController.login);

router.get(
    "/me",
    superAdminAuthenticate,
    superAdminAuthController.me
);

module.exports = router;
