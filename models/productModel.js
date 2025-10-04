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


};



module.exports = productModel;
