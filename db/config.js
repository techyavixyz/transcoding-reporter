// db/config.js
const path = require("path");
const dotenv = require("dotenv");

// Ensure env is loaded before exporting
const envFile = path.join(__dirname, `../.env.${process.env.NAMESPACE_JK || "local"}`);
dotenv.config({ path: envFile });

module.exports = {
  wacProd: process.env.MONGO_DB_URL_WAC_PROD || "",
  driveProd: process.env.MONGO_DB_URL_DRIVE_PROD || "",
};
