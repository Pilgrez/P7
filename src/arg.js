"use strict";

function init() {
  require('dotenv').config();

  try {
    module.exports.db = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USER,
      database: process.env.DB_DATABASE,
      password: process.env.DB_PASS
    };
    console.log(process.env);
    console.log(module.exports);
  } catch (e) {
    console.log(e, "Cannot start: error loading env");
    process.exit(2);
  }
}

module.exports = {
  init: init
}

function parseBoolean(str) {
  return str.toLowerCase() == "true" ? true : false;
}
