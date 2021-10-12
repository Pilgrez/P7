var fs = require('fs');

var POSTS = require(__dirname + '/posts.js'),
  USERS = require(__dirname + '/users.js');

const PATH_LOGIN = __dirname + '/../public/login.html',
  PATH_HOME = __dirname + '/../public/home.html';

function register(app) {
  // login page
  app.all("/", login);
  // Home
  app.post("/social", dashboard);

  // login
  app.post("/login", USERS.login);
  // register
  app.post("/register", USERS.register);
  // api path
  app.post("/:cat/:action", map);
}

function login(req, res) {
  // just return the login page
  var html = fs.readFileSync(PATH_LOGIN, 'utf-8');
  res.send(html);
}

async function dashboard(req, res) {
  // login user first
  console.log("DASHBOARD", req.body);
  if (!req.body.hasOwnProperty('email') || !req.body.hasOwnProperty('password')) {
    res.json({result:false, info:"Missing email/password"});
    return;
  }

  var r = await USERS.loginUser(req.body.email, req.body.password);
  if (!r.result) {
    res.json(r);
    return;
  }

  var html = fs.readFileSync(PATH_HOME, 'utf-8');

  html = html.replace('@@TOKEN@@', r.token);

  res.send(html);
}

async function map(req, res) {
  console.log("API: ", req.params.cat, req.params.action);

  var auth = await USERS.authenticate(req, res);
  if (!auth.result) {
    res.json(auth);
    return;
  }

  req.user = auth.user;
  switch (req.params.cat) {
    case "posts":
      body = await POSTS.map(req, res);
      break;
    default:
      break;
  }

  res.json(body);
  return;
}

module.exports = {
  register: register
}
