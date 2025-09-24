/**
 * db/connection.js
 * MongoDB connection manager using mongoose.createConnection
 * - Allows connecting to multiple DBs (mdt-prod, wac-config-prod)
 */
const mongoose = require("mongoose");
const dbConfig = require("./config");

mongoose.Promise = global.Promise;


const connections = {};

/**
 * Create or return existing connection for a given DB key
 * @param {string} name - key from db/config.js (e.g. "newProd", "wacProd")
 */
function getConnection(name) {
  if (connections[name]) {
    return connections[name];
  }

  const uri = dbConfig[name];
  if (!uri) {
    throw new Error(`No Mongo URI found for connection: ${name}`);
  }

  console.log(`Connecting to MongoDB [${name}]: ${uri}`);
  const conn = mongoose.createConnection(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  conn.on("connected", () => console.log(`Mongo connected [${name}]`));
  conn.on("error", (err) => console.error(`Mongo connection error [${name}]:`, err.message));

  connections[name] = conn;
  return conn;
}

module.exports = { getConnection };
