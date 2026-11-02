
const db = require("../db/db");

const productModel = {
    async getAllProducts(warehouseId) {
        const [rows] = await db.query(
            "SELECT * FROM products WHERE warehouse_id = ?",
            [warehouseId]
        );
        return rows;
    },

    async getProductByID(id, warehouseId) {
        const [rows] = await db.query(
            "SELECT * FROM products WHERE id = ? AND warehouse_id = ?",
            [id, warehouseId]
        );
        return rows[0] || null;
    },

    async createProduct({
        name,
        description,
        stock_quantity,
        low_stock_threshold,
        warehouseId
    }) {
        const [result] = await db.query(
            `INSERT INTO products
                (NAME, DESCRIPTION, stock_quantity,
                 low_stock_threshold, warehouse_id)
             VALUES (?, ?, ?, ?, ?)`,
            [
                name,
                description,
                stock_quantity,
                low_stock_threshold,
                warehouseId
            ]
        );

        return this.getProductByID(result.insertId, warehouseId);
    },

    async updateProduct(id, data, warehouseId) {
        const {
            name,
            description,
            stock_quantity,
            low_stock_threshold
        } = data;

        if (stock_quantity !== undefined && stock_quantity < 0) {
            throw new Error("Stock quantity cannot be negative");
        }

        const [result] = await db.query(
            `UPDATE products
             SET NAME = ?, DESCRIPTION = ?, stock_quantity = ?,
                 low_stock_threshold = ?
             WHERE id = ? AND warehouse_id = ?`,
            [
                name,
                description,
                stock_quantity,
                low_stock_threshold,
                id,
                warehouseId
            ]
        );

        if (result.affectedRows === 0) {
            return null;
        }

        return this.getProductByID(id, warehouseId);
    },

    async deleteProduct(id, warehouseId) {
        const [result] = await db.query(
            "DELETE FROM products WHERE id = ? AND warehouse_id = ?",
            [id, warehouseId]
        );

        if (result.affectedRows === 0) {
            throw new Error("Product not found");
        }

        return { message: "Product deleted successfully" };
    },

    async increaseStock(id, quantity, warehouseId) {
        const product = await this.getProductByID(id, warehouseId);

        if (!product) {
            throw new Error("Product not found");
        }

        await db.query(
            `UPDATE products
             SET stock_quantity = stock_quantity + ?
             WHERE id = ? AND warehouse_id = ?`,
            [quantity, id, warehouseId]
        );

        await db.query(
            `INSERT INTO stock_history
                (product_id, change_type, quantity)
             VALUES (?, 'increase', ?)`,
            [id, quantity]
        );

        return this.getProductByID(id, warehouseId);
    },

    async decreaseStock(id, quantity, warehouseId) {
        const product = await this.getProductByID(id, warehouseId);

        if (!product) {
            throw new Error("Product not found");
        }

        if (product.stock_quantity < quantity) {
            throw new Error("insufficient stock");
        }

        await db.query(
            `UPDATE products
             SET stock_quantity = stock_quantity - ?
             WHERE id = ? AND warehouse_id = ?`,
            [quantity, id, warehouseId]
        );

        await db.query(
            `INSERT INTO stock_history
                (product_id, change_type, quantity)
             VALUES (?, 'decrease', ?)`,
            [id, quantity]
        );

        return this.getProductByID(id, warehouseId);
    },

    async getLowStockProducts(warehouseId) {
        const [rows] = await db.query(
            `SELECT *
             FROM products
             WHERE warehouse_id = ?
               AND stock_quantity <= low_stock_threshold`,
            [warehouseId]
        );
        return rows;
    },

    async getStockHistory(productId, warehouseId) {
        const [rows] = await db.query(
            `SELECT sh.*
             FROM stock_history sh
             INNER JOIN products p ON p.id = sh.product_id
             WHERE sh.product_id = ?
               AND p.warehouse_id = ?
             ORDER BY sh.created_at DESC`,
            [productId, warehouseId]
        );
        return rows;
    },

    
    async getDashboardSummary(warehouseId) {
        const [rows] = await db.query(
            `SELECT
                COUNT(*) AS total_products,
                COALESCE(SUM(stock_quantity), 0) AS total_stock_units,

                COALESCE(SUM(
                    CASE
                        WHEN stock_quantity > 0
                        AND stock_quantity <= low_stock_threshold
                        THEN 1 ELSE 0
                    END
                ), 0) AS low_stock_items,

                COALESCE(SUM(
                    CASE
                        WHEN stock_quantity = 0
                        THEN 1 ELSE 0
                    END
                ), 0) AS out_of_stock_items,

                COALESCE(SUM(
                    CASE
                        WHEN stock_quantity > low_stock_threshold
                        THEN 1 ELSE 0
                    END
                ), 0) AS in_stock_items

            FROM products
            WHERE warehouse_id = ?`,
            [warehouseId]
        );

        return rows[0];
    },

    async getRecentActivity(warehouseId) {
        const [rows] = await db.query(
            `SELECT
                sh.id,
                sh.product_id,
                p.name AS product_name,
                sh.change_type,
                sh.quantity,
                sh.created_at
            FROM stock_history sh
            INNER JOIN products p ON p.id = sh.product_id
            WHERE p.warehouse_id = ?
            ORDER BY sh.created_at DESC
            LIMIT 10`,
            [warehouseId]
        );

        return rows;
    },

};

module.exports = productModel;
