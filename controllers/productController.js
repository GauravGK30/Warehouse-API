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




module.exports = {
    getAllProducts,
    getProductByID,
};