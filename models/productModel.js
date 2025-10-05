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
        const[result] = await db.query(
            "INSERT INTO products (name, description, stock_quantity, low_stock_threshold) VALUES (?,?,?,?)",
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
        
        await db.query(
            "UPDATE products SET name = ?, description = ?, stock_quantity = ?, low_stock_threshold = ? WHERE id = ?",
            [name, description, stock_quantity, low_stock_threshold, id]
        );

        const[rows] = await db.query("SELECT * FROM products where id = ?",[id]);
        return rows[0];
    },


    //delete product
    deleteProduct: async(id)=>{
        const[result] = await db.query("DELETE FROM products WHERE id = ?",[id]);
        if (result.affectedRows === 0) {
            throw new Error("Product not found");
        }
        return {message: "Product deleted successfully! "};
    },


    //increase stock
    increaseStock: async (id,quantity)=>{
        const[rows] = await db.query("SELECT * FROM products WHERE id = ?", [id]);
            
        if (!rows[0]) {
            throw new Error("Product not found");
        }

        await db.query("UPDATE products SET stock_quantity = stock_quantity + ? where id =?",
            [quantity,id]
        );

        await db.query(
            "INSERT INTO stock_history (product_id, change_type, quantity) VALUES (?, 'increase', ?)",
            [id,quantity]
        );

        const[updated] = await db.query("SELECT * FROM products WHERE id = ?",[id]);
        return updated[0]
    },


    //decrease stock
    decreaseStock: async (id,quantity) =>{
        const[rows] = await db.query("SELECT * FROM products where id = ?",[id]);
        const product = rows[0];

        if(!product) throw new Error("product not found");

        if(product.stock_quantity < quantity) throw new Error("insufficient stock");

        await db.query("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?", [quantity, id]);

        await db.query(
            "INSERT INTO stock_history (product_id, change_type, quantity) VALUES (?, 'decrease', ?)",
            [id, quantity]
        );

        const[updated] = await db.query("SELECT * FROM products where id = ?",[id]);
        return updated[0];

    },


    //get low stock products 
    getLowStockProducts: async()=>{
        const[rows] = await db.query("SELECT * FROM low_stock_products")
        return rows;
    },


    //get stock history of a product
    getStockHistory: async(productId) =>{
        const [rows] = await db.query(
        "SELECT * FROM stock_history WHERE product_id = ? ORDER BY created_at DESC",
        [productId]
        );        
        return rows;
    },

};



module.exports = productModel;
