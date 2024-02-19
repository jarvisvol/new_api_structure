const db = require('mysql2');
const fs = require('fs');
require('dotenv').config();


const dataBase = db.createPool({
    host:process.env.HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        ca: fs.readFileSync('/home/shubhamsingh/Documents/my_credn/DigiCertGlobalRootCA.crt.pem'),
      }

}).promise();

module.exports = dataBase;