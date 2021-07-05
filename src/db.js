"use strict";

var mysql = require('mysql');

var ARG = require(__dirname + '/arg.js');
const CONFIG = [{
  name: "test",
  columns: [
    { name: "keyName", type: "TEXT", nullDefault: true},
    { name: "value", type: "TEXT", nullDefault: true}
  ]
}, {
  name: "users",
  columns: [
    { name: "userId", type: "TEXT", nullDefault: false},
    { name: "email", type: "TEXT", nullDefault: false},
    { name: "creationDate", type: "a", nullDefault: false},
    { name: "username", type: "TEXT", nullDefault: true},
    { name: "password", type: "TEXT", nullDefault: true},
    { name: "displayName", type: "TEXT", nullDefault: true},
    { name: "avatar", type: "TEXT", nullDefault: true}
  ]
}];

async function start() {
  return new Promise((resolve, reject) => {
    module.exports.connection = mysql.createConnection(ARG.db);
    module.exports.connection.connect(async (err) => {
      if (err != null) {
        console.error(err);
        console.error("Error connecting to DB");
        process.exit(75);
      }

      await verifyDB();
      await testDB();
      resolve();
    });
  });
}

/*
  Verification Part
*/

async function verifyDB() {
  // verify that data base exist
  const query = `CREATE DATABASE IF NOT EXISTS ${ARG.db.database}`;
  var verifDB = await sendQuery(query);
  if (!verifDB.result) {
    console.log(verifDB);
    process.exit(76);
  }

  var verifColumn = await verifyColumn();
  if (!verifColumn.result) {
    console.log(verifColumn);
    process.exit(76);
  }

  return;
}

async function verifyColumn() {
  for (var i = 0; i < CONFIG.length; i++) {
    var col = CONFIG[i];
    console.log(`DB - Verify - ${col.name}`);

    // check if exist
    var queryExist = `SHOW TABLES LIKE '${col.name}'`;
    var exist = await sendQuery(queryExist);
    if (!exist.result || exist.r.length == 0) {
      var create = await createColumn(col);
      if (!create.result) {
        console.log(create);
        process.exit(76);
      }
      continue;
    }

    var keys = Object.keys(exist.r[0]);
    var ok = exist.r[0][keys[0]];
    if (ok == col.name) {
      console.log("DB - OK - "+col.name);
      continue;
    }
    //console.log("exist", keys, , exist);
    console.log(`DB - FAILED - ${col.name} | ${ok}`);
    process.exit(76);
  }
  return ({result:true, info:"All Tables exist"});
}

/*
  Creation Part
*/

async function createColumn(col) {


}

CREATE TABLE `P7`.`users` ( `userId` TEXT NOT NULL , `email` TEXT NOT NULL , `creationDate` DATETIME NOT NULL , `username` TEXT NOT NULL , `password` TEXT NULL , `displayName` TEXT NULL DEFAULT NULL , `avatar` TEXT NULL DEFAULT '/img/avatar_default.svg' , PRIMARY KEY (`userId`)) ENGINE = InnoDB; 

async function sendQuery(query) {
  return new Promise((resolve, reject) => {
    console.log(`Performing query: ${query}`);

    module.exports.connection.query(query, function (error, results, fields) {
      if (error != null) {
        resolve({result:false, info:"Error performing query", error:error});
        return;
      }

      //console.log("error:", error);
      //console.log("result:", results);
      //console.log("fields", fields);
      resolve({result:true, r:results, fields:fields});
    });

  });
}

function getConfigByColl(coll) {
  switch (coll) {
    case "users":
      return (module.exports.CONFIG_USERS);
    case "test":
      return (module.exports.CONFIG_TEST);
    default:
      return null;
  }
}

/*
  Insert
*/

async function insertOne(coll, data) {
  var config = getConfigByColl(coll);
  if (config == null) return ({result:false, info:"Invalid table"});

  return new Promise((resolve, reject) => {
    //console.log("config", users);
    try {
      //var qValue = buildQueryValue(data);
      var query = `INSERT INTO ${coll} SET ?`;

      module.exports.connection.query(query, data, function (error, results, fields) {
        console.log("result error", error);
        console.log("result result", results);
        console.log("fields", fields);
        // error will be an Error if one occurred during the query
        // results will contain the results of the query
        // fields will contain information about the returned results fields (if any)
      });

      //var query = `INSERT INTO ${coll} ` + buildValueInsert(data);
      //console.log(query);
    } catch (e) {
      //console.log(e);
      console.log("Error catched");
      resolve({result:false, info:"Error performing query", error:e});
    }
  });



  //var sql = 'SELECT * FROM users WHERE id = ' + connection.escape(userId);
  //console.log(sql);
}

function buildValueInsert(data) {

  //'SELECT * FROM users foo = ?, bar = ?, baz = ? , ['a', 'b', 'c', userId], [userId],


  var query = "(", values = "(", keys = Object.keys(data);
  console.log("keys", keys);

  keys.forEach((key, i) => {
    query += `${key}`;
    values += `'${data[key]}'`;
    if (i != keys.length-1) { query += ", "; values += ", "; }
    if (i == keys.length-1) { query += ")"; values += ")"; }
  });

  console.log("query", query);
  console.log("values", values);
  var done = `${query} VALUES ${values}`;
  console.log("finish", done);
  return done;
}

/*
  Test Part
*/

async function testDB() {
  // create random object
  var object = {key:"test", value:"true"};

  var ok = await insertOne('test', object);
  if (!ok.result) {
    console.log(r, 'Error testing db: cannot insert');
    process.exit(76);
  }

  var del = await deleteOne('test', object);
  if (!del.result) {
    console.log(r, 'Error testing db: cannot remove');
    process.exit(76);
  }

  return;
}

module.exports = {
  start: start
}
