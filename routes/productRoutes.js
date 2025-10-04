const express = require("express");
const router = express.Router();

const productController = require("../controllers/productController");


//Low-stock product
router.get("/low-stock",productController.getLowStockProducts);
//stock history
router.get("/:id/history",productController.getStockHistory);



//CRUD  (PRODUCT MANAGEMENT)

//get all products and product by id
router.get("/",productController.getAllProducts);
router.get("/:id",productController.getProductByID);

//create product
router.post("/",productController.createProduct);

//update product
router.put("/:id",productController.updateProduct);

//delete product
router.delete("/:id",productController.deleteProduct);


//STOCK MANAGEMENT
//increase Stock 
router.post("/:id/increase",productController.increaseStock);
//decrease stock
router.post("/:id/decrease",productController.decreaseStock);



module.exports = router;