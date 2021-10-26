"use strict";

var fs = require('fs');

var DB = require(__dirname + '/db.js'),
  CRYPTO = require(__dirname + '/crypto.js');

/*
  Login
*/
async function login(req, res) {
  if (!req.body.hasOwnProperty('email') || !req.body.hasOwnProperty('password')) {
    res.json({result:false, info:"Missing email/password"});
    return;
  }

  var r = await loginUser(req.body.email, req.body.password);
  if (!r.result) {
    res.json(r);
    return;
  }

  // user is logged
  res.json({result:true, token:r.token});
}

async function loginUser(email, password) {
  // look for the email
  var user = await getByEmail(email);
  console.log(user);
  if (!user.result) {
    return({result:false, info:"Invalid Credential"});
  }

  // compare password hash
  var compare = await CRYPTO.compare(password, user.user.password);
  console.log("compare", compare);
  if (!compare.result) {
    return({result:false, info:"Invalid Credential"});
  }

  return ({result:true, token:user.user.token, user:user});
}

/*
  Register
*/

async function register(req, res) {
  console.log("BODY", req.body);

  if (!req.body.hasOwnProperty('email') || !req.body.hasOwnProperty('password')) {
    res.json({result:false, info:"Missing email/password"});
    return;
  }

  // check already used email
  var user = await getByEmail(req.body.email);
  console.log("CHECK EMAIL", user);
  if (user.result) {
    res.json({result:false, info:"Email already in use"});
    return;
  }

  // hash the password
  var hash = await CRYPTO.hash(req.body.password);
  console.log("HASH", hash);
  if (!hash.result) {
    res.json({result:false, info:"Internal Error"});
    return;
  }

  var user = {
    email: req.body.email,
    creationDate: new Date(),
    password: hash.hash,
    displayName: req.body.email.split("@")[0],
    avatar: "none",
    token: DB.generateToken(48)
  }

  // push to DB
  var insert = await DB.insertOne('users', user);
  if (!insert.result) {
    res.json({result:false, info:"Internal error"});
    return;
  }

  // create avatar
  var avatar = await createAvatar(user.email);
  if (!avatar.result) {
    res.json({result:false, info:"Error creating your avatar, please contact admin !"});
    return;
  }

  // user is logged
  res.json({result:true, info:"Welcome in ! You can now login"});
}

async function createAvatar(email) {
  var r = await getByEmail(email);
  if (!r.result) return r;

  try {
    const out = __dirname + `/../public/img/users/${r.user.userId}.svg`;
    const color = getRandomColor();
    var avatar = fs.readFileSync(__dirname + '/../public/img/default-avatar.svg', 'utf-8');
    avatar = avatar.replace(new RegExp(/@@COLOR@@/, 'g'), color);
    console.log(new RegExp(/@@COLOR@@/, 'g'), color);
    fs.writeFileSync(out, avatar, 'utf-8');

    r.user.avatar = `/img/users/${r.user.userId}.svg`;
    var update = await DB.update('users', r.user, `userId = ${r.user.userId}`);
    if (!update.result) return (update);

    return ({result:true});
  } catch (e) {
    console.log(e);
    return ({result:false, info:"Error creating avatar", error:e});
  }
}

function getRandomColor() {
  var letters = "0123456789ABCDEF", color = "#";
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

/*
  Delete Account
*/

async function deleteAccount(req, res) {

  var result = await DB.deleteOne('users', {userId: req.user.userId});
  if (!result.result) return (result);

  return ({result:true, info:"Account removed, bye !"});
}

/*
  Update Account
*/

async function updateAccount(req, res) {
  // rebuild json if no picture -> object null prototype
  if (!req.file) req.body = JSON.parse(JSON.stringify(req.body));

  if (req.body.hasOwnProperty('displayName')) req.user.displayName = req.body.displayName;
  if (req.body.hasOwnProperty('email')) {
    if (!isValidEmail(req.body.email)) return ({result:false, info:"Invalid Email"});
    req.user.email = req.body.email;
  }

  // check if new avatar
  if (req.file) req.user.avatar = '/uploads/'+req.file.filename;

  var update = await DB.update("users", req.user, `userId = ${req.user.userId}`);
  if (!update.result) return (update);

  return ({result:true, info:"Profile updated", avatar:req.user.avatar});
}

/*
  Authenticate
*/

async function authenticate(req, res) {
  console.log("authenticate:", req.body);
  var body404 = {result:false, errorCode:404, info:"Unauthorized"};

  if (!req.body.hasOwnProperty('x-token')) return body404;

  var find = await getByToken(req.body['x-token']);
  if (!find.result) return body404;

  return ({result:true, user: find.user});
}

/*
  Get
*/

async function getByEmail(email) {
  var r = await DB.find('users', {email:email});

  if (r.r.length == 0) return ({result:false, info:"User not found"});
  return ({result:true, user:r.r[0]});
}

async function getByToken(token) {
  var r = await DB.find('users', {token:token});

  if (r.r.length == 0) return ({result:false, info:"User not found"});
  return ({result:true, user:r.r[0]});
}

/*
  Map
*/

async function map(req, res) {
  switch (req.params.action) {
    case "deleteAccount":
      return await deleteAccount(req, res);
    case "update":
      return await updateAccount(req, res);
    default:
      return ({result:false, info: `Unknown path under users: ${req.params.action}`});
  }
}

function isValidEmail(email) {
  const reg = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return reg.test(String(email).toLowerCase());
}

module.exports = {
  login: login,
  register: register,
  authenticate: authenticate,

  getByEmail: getByEmail,
  loginUser: loginUser,

  map: map
}
