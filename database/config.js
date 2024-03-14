const db = require('mysql2');
const fs = require('fs');
require('dotenv').config();


const dataBase = db.createPool({
    host:process.env.HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

}).promise();

module.exports = dataBase;