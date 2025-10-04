const mysql = require("mysql2/promise");
const fs = require("fs");
require("dotenv").config();
const path = require("path");

let pool;

try {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  console.log("Connected to MySQL database");
} catch (err) {
  console.log("Connection not found");
}

module.exports = pool;