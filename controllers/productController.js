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



module.exports = {
    getAllProducts,
    getProductByID,
    createProduct,
    updateProduct,
    deleteProduct
};