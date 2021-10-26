var fs = require('fs'),
  multer = require('multer');

var multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, __dirname + '/../public/uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '.' + file.originalname.split('.').pop())
  }
});

const upload = multer({ storage: multerStorage });

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
  app.post("/:cat/:action", upload.single('image'), map);
}

function login(req, res) {
  // just return the login page
  var html = fs.readFileSync(PATH_LOGIN, 'utf-8');
  res.send(html);
}

async function dashboard(req, res) {
  // login user first
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
  //html = html.replace('@@USER_AVATAR@@', `/img/users/${r.user.user.userId}.svg`);

  // return user object without sensitive data
  delete r.user.user.password;
  delete r.user.user.isAdmin;
  html = html.replace('@@USER_DATA@@', JSON.stringify(r.user.user));
  res.send(html);
}

async function map(req, res) {
  console.log("API: ", req.params.cat, "->", req.params.action);

  // if image found rebuild body
  if (!req.headers['content-type'].includes('application/json')) req.body = JSON.parse(JSON.stringify(req.body));

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
    case "users":
      body = await USERS.map(req, res);
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
