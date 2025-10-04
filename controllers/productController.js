const productModel = require("../models/productModel");


//GET /api/products
//return all products

const getAllProducts = async(req,res) =>{
    try{
        const products = await productModel.getAllProducts();
        res.json(products); 
    }catch(err){
        console.error("Error in getAllProducts:", err);

        res.status(500).json({
            error: "failed to fetch products"
        });
    }
};


//GET  /api/products/:id
//return product by id

const getProductByID = async(req,res) =>{
    try{
        const product = await productModel.getProductByID(req.params.id);
        if(!product){
            res.status(404).json({
                message: "Product not found"
            });
        }
        res.json(product); 
    }catch(err){
        console.error("Error in getProductByID:", err);

        res.status(500).json({
            error: "failed to fetch product"
        });
    }
};


//POST  /api/products
//create a new product

const createProduct = async(req,res)=>{
    try{
        const{name,description,stock_quantity,low_stock_threshold} = req.body;
        if(!name || stock_quantity ===undefined){
            return res.status(400).json({
                error: "name and stock quantity are required"
            });
        }

        if(stock_quantity < 0){
            return res.status(400).json({
                error: "stock quantity cannot be negative"
            });
        }

        const newProduct = await productModel.createProduct({
            name, 
            description, 
            stock_quantity, 
            low_stock_threshold
        });

        res.status(201).json(newProduct);

    }catch(err){
        res.status(500).json({
            error: "Failed to create product "
        });
    }
};


//PUT   /api/products/:id
//update a existing product
const updateProduct = async(req,res)=>{
    try{
        const{name,description,stock_quantity,low_stock_threshold} = req.body;

        if(stock_quantity < 0){
            return res.status(400).json({
                error: "stock quantity cannot be negative"
            });
        }

        const updatedProduct = await productModel.updateProduct(
            req.params.id, {
                name,
                description, 
                stock_quantity, 
                low_stock_threshold
            });

        if(!updatedProduct){
            return res.status(404).json({
                error: "product not found"
            });
        }
        
        res.json(updatedProduct);

    }catch(err){
        res.status(500).json({
            error: "Failed to update product "
        });
    }
};


//DELETE   /api/products/:id
//delete a product

const deleteProduct = async(req,res) =>{
    try{
        await productModel.deleteProduct(req.params.id);
        res.json({
            message: "product deleted successfully"
        });
    }catch(err){
        res.status(500).json({
            error: "failed to delete product"
        });
    }
};


//POST /api/products/:id/increase
//increase the stock : quantity = +50

const increaseStock = async (req,res)=>{
    try{
        const {quantity}  = req.body;
        
        if(!quantity || quantity <= 0){
            return res.status(400).json({
                error: "quantity must be > 0"
            });
        } 
        const product = await productModel.increaseStock(req.params.id,quantity);
        res.json(product);
    
    }catch (err){
        if(err.message === "Product not found"){
            return res.status(404).json({
                error: "Product not found"
            });
        }
        res.status(500).json({
            error: err.message|| "failed to increase stock"
        });
    }
};


//POST /api/products/:id/decrease
const decreaseStock = async (req,res)=>{
    try{
        const {quantity} = req.body;
        if(!quantity || quantity <= 0) return res.status(400).json({error: "quantity must be > 0"});

        const product = await productModel.decreaseStock(req.params.id,quantity);
        res.json(product);

    }catch(err){
        if(err.message === "insufficient stock"){
            return res.status(400).json({
                error: "insufficient stock"
            });
        }
        res.status(500).json({
            error: err.message || "failed to decrease stock"
        });
    }
};


//GET /api/products/low-stock
//return all the low stock products
const getLowStockProducts = async (req,res)=>{
    try{
        const products = await productModel.getLowStockProducts();
        res.json(products);
    }catch(err){
        res.status(500).json({
            error: "failed to fetch low stock products"
        });
    }
};


//GET /api/products/:id/history
//return stock history
const getStockHistory = async(req,res) =>{
    try{
        const history = await productModel.getStockHistory(req.params.id);
        res.json(history);
    }catch(err){
        res.status(500).json({
            error: "failed to fetch stock history"
        });
    }
};

module.exports = {
    getAllProducts,
    getProductByID,
    createProduct,
    updateProduct,
    deleteProduct,
    increaseStock,
    decreaseStock,
    getLowStockProducts,
    getStockHistory
};