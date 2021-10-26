"use strict";

var mysql = require('mysql');

var ARG = require(__dirname + '/arg.js');
const CONFIG = [{
  name: "test",
  idAutoIncrement: "id",
  fields: [
    { name: "keyName", type: "TEXT", nullDefault: true},
    { name: "value", type: "TEXT", nullDefault: true}
  ]
}, {
  name: "users",
  idAutoIncrement: "userId",
  fields: [
    { name: "email", type: "TEXT", nullDefault: false },
    { name: "creationDate", type: "DATETIME", nullDefault: false },
    { name: "password", type: "TEXT", nullDefault: true },
    { name: "displayName", type: "TEXT", nullDefault: true },
    { name: "avatar", type: "TEXT", nullDefault: false},
    { name: "token", type: "TEXT", nullDefault: false },
    { name: "isAdmin", type: "BOOLEAN", nullDefault: false, default: "FALSE" },
    { name: "likedPosts", type: "TEXT", nullDefault: false }
  ]
}, {
  name: "posts",
  idAutoIncrement: "postId",
  fields: [
    { name: "creationDate", type: "DATETIME", nullDefault: false },
    { name: "userId", type: "TEXT", nullDefault: false },
    { name: "avatar", type:"TEXT", nullDefault:false },
    { name: "type", type: "TEXT", nullDefault: false },
    { name: "content", type: "TEXT", nullDefault: false },
    { name: "likes", type:"INT", nullDefault: false },
    { name: "comments", type:"INT", nullDefault: false}
  ]
}, {
  name: "comments",
  idAutoIncrement: "commentId",
  fields: [
    { name: "creationDate", type: "DATETIME", nullDefault: false },
    { name: "userId", type: "TEXT", nullDefault: false },
    { name: "postId", type: "TEXT", nullDefault: false },
    { name: "comment", type: "TEXT", nullDefault: false },
  ]
}];

async function start() {
  return new Promise((resolve, reject) => {
    module.exports.connection = mysql.createConnection(ARG.db);
    module.exports.connection.connect(async (err) => {
      if (err != null && err.code == "ER_BAD_DB_ERROR") {
        console.log(`Error: db not found, please create "${ARG.db.database}"`);
        process.exit(75);
      } else if (err != null) {
        console.error(err);
        console.error("Error connecting to DB");
        process.exit(75);
      }

      await verifyDB();
      await testDB();
      console.log(`[DB] Test OK`);
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
    //console.log("exist", exist);
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
  console.log("Creating col: "+col.name);

  var query = buildColCreationQuery(col);
  //console.log(query);
  var result = await sendQuery(query);
  return result;
}

function buildColCreationQuery(col) {
  var query = `CREATE TABLE \`${ARG.db.database}\`.\`${col.name}\` (`;

  for (var i = 0; i < col.fields.length; i++) {
    var f = col.fields[i];
    var n = f.nullDefault ? " NOT NULL" : " NULL";
    var d = f.hasOwnProperty('default') ? ` DEFAULT ${f.default}` : "";
    var l = i == col.fields.length-1 ? "" : ",";

    query += ` \`${f.name}\` ${f.type}${n}${d}${l} `;
  }
  if (col.hasOwnProperty('primaryKey')) {
    query += `, PRIMARY KEY (\`${col.primaryKey}\`)`;
  }
  if (col.hasOwnProperty('idAutoIncrement')) {
    query += `, ${col.idAutoIncrement} INT NOT NULL AUTO_INCREMENT PRIMARY KEY`;
  }


  query += ")";
  return query;
}

/*
  Send Query
*/
async function sendQuery(query) {
  return new Promise((resolve, reject) => {
    console.log(`Performing query: ${query}`);

    module.exports.connection.query(query, function (error, results, fields) {
      if (error != null) {
        resolve({result:false, info:"Error performing query", error:error});
        return;
      }

      console.log("error:", error);
      console.log("result:", results);
      console.log("fields", fields);
      resolve({result:true, r:results, fields:fields});
    });

  });
}

function getConfigByColl(coll) {
  switch (coll) {
    case "users":
      return (CONFIG[1]);
    case "test":
      return (CONFIG[0]);
    case "posts":
      return (CONFIG[2]);
    case "comments":
      return (CONFIG[3]);
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

  //var query = buildInsertQuery(coll, data);

  return new Promise((resolve, reject) => {
    try {
      var query = `INSERT INTO ${coll} SET ?`;
      //console.log(query);

      module.exports.connection.query(query, data, function (error, results, fields) {
        if (error != null) {
          resolve({result:false, info:"Error performing 'insert' query", error:error});
          return;
        }

        //console.log("error:", error);
        //console.log("result:", results);
        //console.log("fields", fields);
        resolve({result:true, r:results, fields:fields});
      });
    } catch (e) {
      console.log("Error catched");
      resolve({result:false, info:"Error performing query", error:e});
    }
  });



  //var sql = 'SELECT * FROM users WHERE id = ' + connection.escape(userId);
  //console.log(sql);
}

/*
  Find
*/

async function find(coll, data) {
  var config = getConfigByColl(coll);
  if (config == null) return ({result:false, info:"Invalid table"});

  return new Promise((resolve, reject) => {
    try {
      var query = `SELECT * FROM ${coll} WHERE ?`;
      console.log("[FIND]", query);

      module.exports.connection.query(query, data, function (error, results, fields) {
        if (error != null) {
          resolve({result:false, info:"Error performing 'insert' query", error:error});
          return;
        }

        //console.log("error:", error);
        //console.log("result:", results);
        //console.log("fields", fields);
        resolve({result:true, r:results});
      });
    } catch (e) {
      console.log("Error catched");
      resolve({result:false, info:"Error performing query", error:e});
    }
  });
}

async function findAll(coll, extra="") {
  var config = getConfigByColl(coll);
  if (config == null) return ({result:false, info:"Invalid table"});

  return new Promise((resolve, reject) => {
    try {
      var query = `SELECT * FROM ${coll} ${extra}`;
      console.log("[FIND]", query);

      module.exports.connection.query(query, function (error, results, fields) {
        if (error != null) {
          resolve({result:false, info:"Error performing 'insert' query", error:error});
          return;
        }
        resolve({result:true, r:results});
      });
    } catch (e) {
      console.log("Error catched");
      resolve({result:false, info:"Error performing query", error:e});
    }
  });
}

/*
  Update
*/

async function update(coll, data, where) {
  var config = getConfigByColl(coll);
  if (config == null) return ({result:false, info:"Invalid table"});
  console.log("new data", data);

  return new Promise((resolve, reject) => {
    try {
      var query = `UPDATE ${coll} SET ? WHERE ${where}`;
      console.log("[UPDATE]", query);

      module.exports.connection.query(query, data, function (error, results, fields) {
        if (error != null) {
          resolve({result:false, info:"Error performing 'update' query", error:error});
          return;
        }

        //console.log("error:", error);
        //console.log("result:", results);
        //console.log("fields", fields);
        resolve({result:true, r:results});
      });
    } catch (e) {
      console.log("Error catched");
      resolve({result:false, info:"Error performing query", error:e});
    }
  });
}

async function updatePost(coll, data) {
  //UPDATE `posts` SET `likes` = '1' WHERE `posts`.`postId` = 4
  var config = getConfigByColl(coll);
  if (config == null) return ({result:false, info:"Invalid table"});
  console.log("new post", data);

  return new Promise((resolve, reject) => {
    try {
      var query = `UPDATE ${coll} SET ? WHERE postId = ${data.postId}`;
      console.log("[UPDATE]", query);

      module.exports.connection.query(query, data, function (error, results, fields) {
        if (error != null) {
          resolve({result:false, info:"Error performing 'update' query", error:error});
          return;
        }

        //console.log("error:", error);
        //console.log("result:", results);
        //console.log("fields", fields);
        resolve({result:true, r:results, fields:fields});
      });
    } catch (e) {
      console.log("Error catched");
      resolve({result:false, info:"Error performing query", error:e});
    }
  });
}

/*
  Delete
*/

async function deleteOne(coll, data) {
  var config = getConfigByColl(coll);
  if (config == null) return ({result:false, info:"Invalid table"});

  //var query = buildInsertQuery(coll, data);

  return new Promise((resolve, reject) => {
    try {
      // DELETE FROM `test` WHERE `test`.`id` = 1
      var query = `DELETE FROM \`${coll}\` WHERE ?`;
      //console.log(query);

      module.exports.connection.query(query, data, function (error, results, fields) {
        if (error != null) {
          resolve({result:false, info:"Error performing 'delete' query", error:error});
          return;
        }

        console.log("[DB-TEST] [DELETE] error:", error);
        console.log("[DB-TEST] [DELETE] result:", results);
        console.log("[DB-TEST] [DELETE] fields", fields);
        resolve({result:true, r:results, fields:fields});
      });
    } catch (e) {
      console.log("Error catched");
      resolve({result:false, info:"Error performing query", error:e});
    }
  });



  //var sql = 'SELECT * FROM users WHERE id = ' + connection.escape(userId);
  //console.log(sql);
}

/*
  Test Part
*/

async function testDB() {
  console.log("[TEST DB]");
  // create random object
  var object = {keyName:"test", value:"true"};

  var ok = await insertOne('test', object);
  if (!ok.result) {
    console.log(ok, 'Error testing db: cannot insert');
    process.exit(76);
  }

  var del = await deleteOne('test', {keyName:"test"});
  if (!del.result) {
    console.log(del, 'Error testing db: cannot remove');
    process.exit(76);
  }

  return;
}


module.exports = {
  start: start,

  find: find,
  findAll: findAll,

  insertOne: insertOne,

  update: update,
  updatePost: updatePost,

  deleteOne: deleteOne,

  generateToken: function (size=24) {
    var token = "";
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for ( var i = 0; i < size; i++ ) {
      token += possible.charAt(Math.floor(Math.random() * possible.length));
   }
   return token;
  }
}
