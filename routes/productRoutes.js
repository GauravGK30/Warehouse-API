const express = require("express");
const router = express.Router();

const productController = require("../controllers/productController");

const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");


// All product routes require login.
router.use(authenticate);


//Low-stock product  -get products below threshold
router.get("/low-stock",productController.getLowStockProducts);
//stock history
router.get("/:id/history",productController.getStockHistory);



//CRUD  (PRODUCT MANAGEMENT)

//get all products and product by id
router.get("/",productController.getAllProducts);
router.get("/:id",productController.getProductByID);



//create product
router.post("/",
    authorize("admin", "manager"),
    productController.createProduct
);

//update product
router.put("/:id",
    authorize("admin", "manager"),
    productController.updateProduct
);

//delete product
router.delete("/:id",
    authorize("admin"),
    productController.deleteProduct
);


//STOCK MANAGEMENT
//increase Stock 
router.post("/:id/increase",
    authorize("admin", "manager", "staff"),
    productController.increaseStock
);
//decrease stock
router.post("/:id/decrease",
    authorize("admin", "manager", "staff"),
    productController.decreaseStock
);



module.exports = router;