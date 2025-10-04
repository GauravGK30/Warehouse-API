const express = require("express");
const router = express.Router();

const productController = require("../controllers/productController");



//CRUD routes

//get all products and product by id
router.get("/",productController.getAllProducts);
router.get("/:id",productController.getProductByID);

//create product
router.post("/",productController.createProduct);

//update product
router.put("/:id",productController.updateProduct);

//delete product
router.delete("/:id",productController.deleteProduct);

//increase Stock 
router.post("/:id/increase",productController.increaseStock);

//decrease stock
router.post("/:id/decrease",productController.decreaseStock);

module.exports = router;