const db = require('../db/db.js');

const productModel ={

    //get all products 
    getAllProducts: async() => {
        const[rows] = await db.query("SELECT * FROM products");
        return rows;
    },


    //get product by id
    getProductByID: async(id) =>{
        const[rows] = await db.query("SELECT * FROM products WHERE id = ?",[id]);
        return rows[0];
    },


    //create product
    createProduct: async({name, description, stock_quantity, low_stock_threshold}) =>{
        const[result] = await db.query("INSERT INTO products (name, description, stock_quantity, low_stock_threshold) VALUES (?,?,?,?)",
            [name, description, stock_quantity, low_stock_threshold]
        );

        return {
            id: result.insertId, 
            name, 
            description, 
            stock_quantity, 
            low_stock_threshold
        };
    },


    //update product
    updateProduct: async( id, {name, description, stock_quantity,low_stock_threshold}) =>{
        if(stock_quantity < 0) {
            throw new Error("Stock quantity cannot be negative");
        }
        
        await db.query("UPDATE products SET name = ?, description = ?, stock_quantity = ?, low_stock_threshold = ? WHERE id = ?",
        [name, description, stock_quantity, low_stock_threshold, id]);

        const[rows] = await db.query("SELECT * FROM products where id = ?",[id]);
        return rows[0];
    },


    //delete product
    deleteProduct: async(id)=>{
        await db.query("DELETE FROM products WHERE id = ?",[id]);
        return {message: "Product deleted successfully! "};
    },



};



module.exports = productModel;
