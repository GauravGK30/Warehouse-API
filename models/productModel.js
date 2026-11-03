const logAudit = require("../utils/auditLogger");
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
        product_code,
        description,
        stock_quantity,
        low_stock_threshold,
        warehouseId,
        userId
    }) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [result] = await connection.query(
                `INSERT INTO products
                (name, product_code, description, stock_quantity,
                low_stock_threshold, warehouse_id)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    name,
                    product_code,
                    description,
                    stock_quantity,
                    low_stock_threshold,
                    warehouseId
                ]
            );

            await logAudit(connection, {
                warehouseId,
                userId,
                action: "CREATE",
                entityType: "PRODUCT",
                entityId: result.insertId,
                entityLabel: `${name} (${product_code})`,
                details: {
                    name,
                    product_code,
                    description,
                    stock_quantity,
                    low_stock_threshold
                }
            });

            await connection.commit();

            return await this.getProductByID(result.insertId, warehouseId);

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    async updateProduct(id, data, warehouseId, userId) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Get existing product and lock its row
            const [rows] = await connection.query(
                `SELECT * FROM products
                WHERE id = ? AND warehouse_id = ?
                FOR UPDATE`,
                [id, warehouseId]
            );

            if (rows.length === 0) {
                throw new Error("Product not found");
            }

            const before = rows[0];

            await connection.query(
                `UPDATE products
                SET name = ?,
                    product_code = ?,
                    description = ?,
                    stock_quantity = ?,
                    low_stock_threshold = ?
                WHERE id = ? AND warehouse_id = ?`,
                [
                    data.name,
                    data.product_code,
                    data.description,
                    data.stock_quantity,
                    data.low_stock_threshold,
                    id,
                    warehouseId
                ]
            );

            const after = {
                name: data.name,
                product_code: data.product_code,
                description: data.description,
                stock_quantity: data.stock_quantity,
                low_stock_threshold: data.low_stock_threshold
            };

            await logAudit(connection, {
                warehouseId,
                userId,
                action: "UPDATE",
                entityType: "PRODUCT",
                entityId: id,
                entityLabel: `${data.name} (${data.product_code})`,
                details: {
                    before,
                    after
                }
            });

            await connection.commit();

            return await this.getProductByID(id, warehouseId);

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    async deleteProduct(id, warehouseId, userId) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [rows] = await connection.query(
                `SELECT * FROM products
                WHERE id = ? AND warehouse_id = ?
                FOR UPDATE`,
                [id, warehouseId]
            );

            if (rows.length === 0) {
                throw new Error("Product not found");
            }

            const product = rows[0];
            const productName = product.NAME ?? product.name;
            const productDescription = product.DESCRIPTION ?? product.description;
            await logAudit(connection, {
                warehouseId,
                userId,
                action: "DELETE",
                entityType: "PRODUCT",
                entityId: id,
                entityLabel: `${productName} (ID: ${id})`,
                details: {
                    name: productName,
                    product_code: product.product_code,
                    description: productDescription,
                    stock_quantity: product.stock_quantity,
                    low_stock_threshold: product.low_stock_threshold
                }
            });

            await connection.query(
                `DELETE FROM products
                WHERE id = ? AND warehouse_id = ?`,
                [id, warehouseId]
            );

            await connection.commit();

            return product;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },


    async increaseStock(id, quantity, warehouseId, userId) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [products] = await connection.query(
                `SELECT *
                FROM products
                WHERE id = ? AND warehouse_id = ?
                FOR UPDATE`,
                [id, warehouseId]
            );

            if (products.length === 0) {
                throw new Error("Product not found");
            }

            const product = products[0];
            const previousStock = product.stock_quantity;
            const newStock = previousStock + quantity;

            await connection.query(
                `UPDATE products
                SET stock_quantity = stock_quantity + ?
                WHERE id = ? AND warehouse_id = ?`,
                [quantity, id, warehouseId]
            );

            await connection.query(
                `INSERT INTO stock_history
                    (product_id, change_type, quantity, changed_by)
                VALUES (?, 'increase', ?, ?)`,
                [id, quantity, userId]
            );

            // Audit logging
            await logAudit(connection, {
                warehouseId,
                userId,
                action: "INCREASE_STOCK",
                entityType: "PRODUCT",
                entityId: id,
                entityLabel: `${product.NAME ?? product.name} (${product.product_code ?? "No Code"})`,
                details: {
                    quantity_added: quantity,
                    previous_stock: previousStock,
                    new_stock: newStock
                }
            });

            await connection.commit();

            return this.getProductByID(id, warehouseId);

        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    async decreaseStock(id, quantity, warehouseId, userId) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [products] = await connection.query(
                `SELECT *
                FROM products
                WHERE id = ? AND warehouse_id = ?
                FOR UPDATE`,
                [id, warehouseId]
            );

            if (products.length === 0) {
                throw new Error("Product not found");
            }

            const product = products[0];

            if (product.stock_quantity < quantity) {
                throw new Error("insufficient stock");
            }

            const previousStock = product.stock_quantity;
            const newStock = previousStock - quantity;

            await connection.query(
                `UPDATE products
                SET stock_quantity = stock_quantity - ?
                WHERE id = ? AND warehouse_id = ?`,
                [quantity, id, warehouseId]
            );

            await connection.query(
                `INSERT INTO stock_history
                    (product_id, change_type, quantity, changed_by)
                VALUES (?, 'decrease', ?, ?)`,
                [id, quantity, userId]
            );

            // Audit logging
            await logAudit(connection, {
                warehouseId,
                userId,
                action: "DECREASE_STOCK",
                entityType: "PRODUCT",
                entityId: id,
                entityLabel: `${product.NAME ?? product.name} (${product.product_code ?? "No Code"})`,
                details: {
                    quantity_removed: quantity,
                    previous_stock: previousStock,
                    new_stock: newStock
                }
            });

            await connection.commit();

            return this.getProductByID(id, warehouseId);

        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
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
                sh.created_at,
                u.name AS employee_name,
                u.employee_code,
                u.role AS employee_role
            FROM stock_history sh
            INNER JOIN products p
                ON p.id = sh.product_id
            LEFT JOIN users u
                ON u.id = sh.changed_by
            WHERE p.warehouse_id = ?
            ORDER BY sh.created_at DESC
            LIMIT 10`,
            [warehouseId]
        );

        return rows;
    },


};

module.exports = productModel;
