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
  if (!req.body.hasOwnProperty('type')) return ({result:false, info:"No Post Type"});

  if (req.body.type == "text") return newPostText(req);
  if (req.body.type == "image") return newPostImage(req);

  return ({result:false, info:"Invalide post type"});
}

function newPostText(req) {
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

function newPostImage(req) {
  if (!req.file) return ({result:false, info:"missing picture"});

  var post = {
    creationDate: new Date(),
    userId: req.user.userId,
    avatar: `/img/users/${req.user.userId}.svg`,
    type: "image",
    content: '/uploads/'+req.file.filename,
    likes: 0,
    comments: 0
  }

  return ({result:true, post:post});
}

/*
  Get
*/

async function getForUser(req, res) {
  var find = await DB.findAll('posts', "ORDER BY creationDate DESC");
  if (!find.result) return r;

  // fill up display name
  var users = [];
  for (var i = 0; i < find.r.length; i++) {
    var trouve = false;
    for (var j = 0; j < users.length; j++) {
      if (users[j].userId == find.r[i].userId) {
        find.r[i].displayName = users[j].displayName;
        find.r[i].avatar = users[j].avatar;
        trouve = true;
        break;
      }
    }

    if (trouve) continue;
    var getName = await DB.find('users', {userId: find.r[i].userId});
    if (!getName.result) return ({result:false, info:"Error getting post display name"});
    //console.log("HERE", getName);

    if (getName.r.length == 0) {
      users.push({userId: find.r[i].userId, displayName:"Deleted Account", avatar:"/img/default-avatar.svg"});
      find.r[i].displayName = "Deleted Account";
      find.r[i].avatar = "/img/default-avatar.svg";
    } else {
      users.push({userId: getName.r[0].userId, displayName:getName.r[0].displayName, avatar:getName.r[0].avatar});
      find.r[i].displayName = getName.r[0].displayName;
      find.r[i].avatar = getName.r[0].avatar;
    }
  }

  //console.log(find);
  return ({result:true, posts:find.r});
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
    req.user.likedPosts = JSON.stringify([req.body.postId]);
    r.post.likes++;
    result = { result:true, status:"liked" };
  } else {
    var tmp = performToggleLike(req.user, r.post);
    if (!tmp.result) return (tmp);
    req.user = tmp.user;
    req.user.likedPosts = JSON.stringify(req.user.likedPosts);
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
  user.likedPosts = JSON.parse(user.likedPosts);
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
  Comments
*/

async function getComments(req, res) {
  if (!req.body.hasOwnProperty('postId')) return ({result:false, info:"Missing PostId"});

  var find = await DB.find("comments", {postId:req.body.postId});
  if (!find.result) return (find);

  var users = [];
  for (var i = 0; i < find.r.length; i++) {
    var trouve = false;
    for (var j = 0; j < users.length; j++) {
      if (users[j].userId == find.r[i].userId) {
        find.r[i].displayName = users[j].displayName;
        find.r[i].avatar = users[j].avatar;
        trouve = true;
        break;
      }
    }

    if (trouve) continue;
    var getName = await DB.find('users', {userId: find.r[i].userId});
    if (!getName.result) return ({result:false, info:"Error getting post display name"});
    //console.log("HERE", getName);

    if (getName.r.length == 0) {
      users.push({userId: find.r[i].userId, displayName:"Deleted Account", avatar:"/img/default-avatar.svg"});
      find.r[i].displayName = "Deleted Account";
      find.r[i].avatar = "/img/default-avatar.svg";
    } else {
      users.push({userId: getName.r[0].userId, displayName:getName.r[0].displayName, avatar:getName.r[0].avatar});
      find.r[i].displayName = getName.r[0].displayName;
      find.r[i].avatar = getName.r[0].avatar;
    }
  }

  console.log("FIND COMMENT", find);

  return ({
    result: true,
    comments: find.r
  });
}

async function comment(req, res) {
  if (!req.body.hasOwnProperty('postId')) return ({result:false, info:"Missing Post Id"});
  if (!req.body.hasOwnProperty('comment')) return ({result:false, info:"Missing comment"});

  var post = await getById(req.body.postId);
  console.log("COMMENT GETPOST", post);
  if (!post.result) return ({result:false, info:"Post not found"});

  var comment = {
    userId: req.user.userId,
    postId: req.body.postId,
    creationDate: new Date(),
    comment: req.body.comment
  };

  var insert = await DB.insertOne("comments", comment);
  console.log("COMMENT INSERT", insert);
  if (!insert.result) return (insert);

  return ({result:true, info:"Comment posted !"});
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
    case "getComments":
      return await getComments(req, res);
    case "comment":
      return await comment(req, res);
    /*case "delete":
      return await delete(req, res);
    */
    default:
      return ({result:false, info: `Unknown path under posts: ${req.params.action}`});
  }
}

module.exports = {
  map:map
}
