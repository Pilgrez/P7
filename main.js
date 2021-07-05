"use strict"

var express = require('express'),
  bodyParser = require('body-parser');

var DB = require(__dirname + '/src/db.js'),
  ARG = require(__dirname + '/src/arg.js');
  //MAPPER = require(__dirname + '/src/mapper.js');

const port = 8080;
var app = express();

async function start() {
  // get configuration
  await ARG.init();
  // connect to db
  await DB.start();

  // use body parser
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));

  // set upload dir as public
  app.use(express.static(__dirname + '/public/'));
  app.use(express.static(__dirname + '/uploads/'));

  // map all route
  //MAPPER.map(app);

  // start server
  app.listen(port, function () {
    console.log("Social Network Running");
    console.log("Port:\t\t" + port);
  });
}

start();
