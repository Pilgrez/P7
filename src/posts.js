"use strict";

var DB = require(__dirname + '/db.js');

async function create(req, res) {
  console.log("user", req.user);
  console.log("body", req.body);

  var verif = verifyPost(req);
  if (!verif.result) return (verif);

  var push = await DB.insertOne('posts', verif.post);
  if (!push.result) return (push);

  return ({result:true, info:"Post Created"});
}

function verifyPost(req) {

  var post = {
    creationDate: new Date(),
    userId: req.user.userId,
    type: "text",
    content: req.body.content
  };

  return ({result:true, post:post});
}

/*
  Get For User
*/

async function getForUser(req, res) {
  var r = await DB.findAll('posts');
  if (!r.result) return r();
  console.log(r);

  return ({result:true, posts:r.r});
}

/*
  Map & Module definition
*/

async function map(req, res) {
  switch (req.params.action) {
    case "create":
      return await create(req, res);
    case "get":
      return await getForUser(req, res);
    default:
      return ({result:false, info: `Unknown path under posts: ${req.params.action}`});
  }
}

module.exports = {
  map:map
}
