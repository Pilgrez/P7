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
    token: DB.generateToken(48)
  }

  // push to DB
  var insert = await DB.insertOne('users', user);
  console.log("PUSH", insert);
  if (!insert.result) {
    res.json({result:false, info:"Internal error"});
    return;
  }

  // create avatar
  var avatar = await createAvatar(user.email);
  if (!avatar.result) {
    res.json({result:false, info:"Error creating your avatar, but you are register !"});
    return;
  }

  // user is logged
  res.json({result:true, info:"Welcome in ! You can now login"});
}

async function createAvatar(email) {
  var r = await getByEmail(email);
  if (!r.result) return r;

  try {
    const out = __dirname + `/../public/users/${r.user.userId}.svg`;
    const color = getRandomColor();
    var avatar = fs.readFileSync(__dirname + '/../public/img/default-avatar.svg', 'utf-8');
    avatar = avatar.replace(new RegExp(/@@COLOR@@/, 'g'), color);
    console.log(new RegExp(/@@COLOR@@/, 'g'), color);
    fs.writeFileSync(out, avatar, 'utf-8');
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

module.exports = {
  login: login,
  register: register,
  authenticate: authenticate,

  getByEmail: getByEmail,
  loginUser: loginUser
}
