"use strict";

var DB = require(__dirname + '/db.js');

/*
  Creation
*/

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
    avatar: `/img/users/${req.user.userId}.svg`,
    type: "text",
    content: req.body.content,
    likes: 0,
    comments: 0
  };

  return ({result:true, post:post});
}

/*
  Get
*/

async function getForUser(req, res) {
  var r = await DB.findAll('posts', "ORDER BY creationDate DESC");
  if (!r.result) return r;
  console.log(r);

  return ({result:true, posts:r.r});
}

async function getById(postId) {
  var r = await DB.find('posts', {postId:postId});
  if (!r.result) return ({result:false, info:"Post not found"});
  return ({result:true, post:r.r[0]});
}

/*
  Like toggle
*/

async function toggleLike(req, res) {
  if (!req.body.hasOwnProperty('postId')) return ({result:false, info:"No post given."});

  var r = await getById(req.body.postId);
  if (!r.result) return r;
  var result = { result: false, info:"Error performing like" };

  if (req.user.likedPosts == null) {
    // nothing liked
    req.user.likedPosts = [req.body.postId];
    r.post.likes++;
    result = { result:true, status:"liked" };
  } else {
    var tmp = performToggleLike(req.user, r.post);
    if (!tmp.result) return (tmp);
    req.user = tmp.user;
    r.post = tmp.post;
    result = { result:true, status: tmp.status };
  }

  // update post
  var updatePost = await DB.updatePost('posts', r.post);
  if (!updatePost.result) return ({result:false, info:"Internal error updating post"});
  // update user like
  var updateUser = await DB.update('users', req.user, `userId = ${req.user.userId}`);
  if (!updateUser.result) return ({result:false, info:"Internal error updating user"});

  console.log("UPDATE USER", updateUser);
  return (result);
}

function performToggleLike(user, post) {
  for (var i = 0; i < user.likedPosts.length; i++) {
    // found so unlike it
    if (user.likedPosts[i] == post.postId) {
      user.likedPosts.splice(i, 1);
      post.likes--;
      return ({result:true, user:user, post:post, status:"unliked"});
    }
  }

  // not found so like it
  user.likedPosts.push(post.postId);
  post.likes++;
  return ({result:true, user:user, post:post, status:"liked"});
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
    case "like":
      return await toggleLike(req, res);
    /*
    case "comment":
      return await comment(req, res);
    case "delete":
      return await delete(req, res);
    */
    default:
      return ({result:false, info: `Unknown path under posts: ${req.params.action}`});
  }
}

module.exports = {
  map:map
}
