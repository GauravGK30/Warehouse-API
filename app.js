const express = require("express");

const productRoutes =  require("./routes/productRoutes");

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use("/api/products", productRoutes);

module.exports = app;