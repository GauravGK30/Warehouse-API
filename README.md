#🏭 Warehouse Inventory Management API

A RESTful API built with Node.js and Express to manage products and inventory in a warehouse. 
This project implements full CRUD operations, stock management with validation, and tracks all inventory changes.

## Overview

This API allows you to:
- Create, read, update, and delete products
- Manage inventory levels with increase/decrease operations
- Prevent negative stock through validation
- Track low-stock products automatically
- View complete stock change history for audit purposes

I built this as a backend-focused solution emphasizing robust business logic and proper error handling.

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MySQL
- **Testing:** Jest + Supertest
- **ORM/Query:** MySQL2 

---

##📂 Project Structure

I organized the code following MVC pattern to keep things clean and maintainable:

warehouse-api/
├── controllers/
│   └── productController.js
├── models/
│   └── productModel.js
├── routes/
│   └── productRoutes.js
├── db/
│   └── db.js
├── tests/
│   └── products.test.js
├── app.js
├── server.js
├── .env
└── package.json



---

## 🎯 API Endpoints

### Product Management (CRUD)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/products` | Get all products |
| `GET` | `/api/products/:id` | Get single product |
| `POST` | `/api/products` | Create new product |
| `PUT` | `/api/products/:id` | Update product |
| `DELETE` | `/api/products/:id` | Delete product |

### Inventory Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/products/:id/increase` | Increase stock quantity |
| `POST` | `/api/products/:id/decrease` | Decrease stock (validates availability) |

### Bonus Features

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/products/low-stock` | Get products below threshold |
| `GET` | `/api/products/:id/history` | Get stock change history |

---

## 🚀 Getting Started

### Prerequisites

Make sure you have these installed:
- **Node.js** (v14 or higher)
- **MySQL** (v8 or higher)
- **npm** or **yarn**


### 1. Clone the Repository
bash
git clone https://github.com/GauravGK30/Warehouse-API.git
cd warehouse-api

###2. Install Dependencies
bash
npm install

This installs Express, MySQL2, Jest, Supertest, and other required packages.



###3. Database Setup
Open your MySQL client (MySQL Workbench, command line, etc.) and run:
sqlCREATE DATABASE warehouse_db;
USE warehouse_db;

CREATE TABLE products(
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    stock_quantity INT NOT NULL DEFAULT 0 CHECK(stock_quantity >= 0),
    low_stock_threshold INT DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE stock_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    change_type ENUM('increase', 'decrease') NOT NULL,
    quantity INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_low_stock ON products(stock_quantity, low_stock_threshold);
CREATE INDEX idx_stock_history_product ON stock_history(product_id);

CREATE VIEW low_stock_products AS
SELECT 
    id, name, description, stock_quantity, low_stock_threshold,
    (low_stock_threshold - stock_quantity) as shortage_amount
FROM products
WHERE stock_quantity < low_stock_threshold;

Optional - Add sample data:
sql
INSERT INTO products (name, description, stock_quantity, low_stock_threshold) VALUES
('Laptop Dell XPS 15', 'High-performance laptop with 16GB RAM and 512GB SSD', 25, 10),
('Wireless Mouse', 'Ergonomic wireless mouse with USB receiver', 5, 8),
('USB-C Cable', '2m USB-C charging cable - Fast charging', 2, 5),
('Monitor 27"', '4K UHD monitor with HDR support', 0, 3),
('Mechanical Keyboard', 'RGB mechanical gaming keyboard with blue switches', 15, 5),
('Webcam HD', '1080p webcam with built-in microphone', 8, 10),
('Headphones', 'Noise cancelling wireless headphones', 1, 4),
('External SSD 1TB', 'Portable SSD with USB 3.2', 30, 8);


###4. Configure Environment Variables
Create a .env file in the root directory. I've included a .env.example as a template:
bash
cp .env.example .env

env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=warehouse_db

Important: Replace your_mysql_password with your actual MySQL password.


###5. Run the Application
bash
npm start

For development with auto-reload:
bash
npm run dev

You should see:
Connected to MySQL database
Server running on port 5000

The API is now available at http://localhost:5000


Example Requests

Create a product:
bash
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Headphones",
    "description": "Noise cancelling headphones",
    "stock_quantity": 30,
    "low_stock_threshold": 10
  }'


Increase stock:
bash
curl -X POST http://localhost:5000/api/products/1/increase \
  -H "Content-Type: application/json" \
  -d '{"quantity": 20}'

Decrease stock:
bash
curl -X POST http://localhost:5000/api/products/1/decrease \
  -H "Content-Type: application/json" \
  -d '{"quantity": 5}'

Get low stock products:
bash
curl http://localhost:5000/api/products/low-stock

Get stock history
curl http://localhost:5000/api/products/:id/history



Running Tests
I've written comprehensive test cases covering all stock management operations and edge cases.
Run all tests:
bash
npm test

What the tests cover:

✅ Stock increase operations
✅ Stock decrease operations
✅ Edge case: Trying to remove more stock than available
✅ Edge case: Decreasing stock to exactly zero
✅ Edge case: Attempting to decrease when already at zero
✅ Validation: Negative quantities rejected
✅ Validation: Zero quantities rejected
✅ Error handling: Non-existent products return 404
✅ Low stock product listing
✅ Stock history tracking


##Design Choices & Assumptions
Architecture Decisions
1. MVC Pattern
I chose the Model-View-Controller pattern to separate concerns clearly. \
This makes the code easier to test and maintain. Each layer has a specific responsibility:

-Models handle database operations
-Controllers contain business logic
-Routes define API endpoints


2. MySQL Over NoSQL
I went with MySQL because inventory management requires:

-Strong data consistency (can't have negative stock!)
-ACID transactions
-Relational data (products + stock history)
-The CHECK constraint prevents negative stock at the database level

##Business Logic Assumptions :

1. Stock Validation

Stock quantity cannot go below zero (enforced at both database and application level)
Quantities must be positive integers
The database CHECK constraint is the final safeguard

2. Low Stock Threshold

Defaults to 3 if not specified
Products are considered "low stock" when stock_quantity < low_stock_threshold
Used a database VIEW for efficient queries

3. Stock History

Tracks every increase/decrease operation
Stores the quantity changed (not the final amount)
Useful for auditing and analyzing inventory patterns
Automatically deleted when a product is deleted (CASCADE)

4. Update Behavior

PUT /api/products/:id allows updating all fields including stock
However, it still validates that stock can't go negative
For normal stock changes, the dedicated increase/decrease endpoints should be used

Error Handling Strategy
I implemented specific HTTP status codes:

200 - Success
201 - Created successfully
400 - Bad request (validation errors, insufficient stock)
404 - Product not found
500 - Server errors

Error responses include descriptive messages to help with debugging.




###⚠️Troubleshooting
Database Connection Issues
If you see "Database connection failed":

Make sure MySQL is running
Verify credentials in .env file
Check if the database exists: SHOW DATABASES;
Ensure MySQL user has proper permissions

Port Already In Use
If port 5000 is taken, change PORT in .env file:
envPORT=3000
Tests Failing
Make sure:

Database is running and accessible
Test data doesn't conflict with existing data
All dependencies are installed: npm install

