const express = require("express");
const router = express.Router();

const productController = require("../controllers/productController");



//CRUD routes

//get all products and product by id
router.get("/",productController.getAllProducts);
router.get("/:id",productController.getProductByID);


module.exports = router;