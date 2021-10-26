document.addEventListener('DOMContentLoaded', start);

var S = {};

function start() {
  var user = JSON.parse(document.querySelector('#user_data').innerHTML);
  user.likedPosts = JSON.parse(user.likedPosts);
  console.log("LOADED USER", user);

  S.app = new Vue({
    el: "#main-content",
    data: {
      user: user,
      posts: []
    },
    methods: {
      togglePostLike: togglePostLike,
      togglePostComment: togglePostComment,
      commentPost: commentPost,
      showProfile: showProfile,
      deletePost: deletePost
    }
  });

  S.newPostHandler = new NewPostHandler();
  S.profileHandler = new ProfileHandler();
  S.mainFrame = new MainFrame();

  refreshUserAvatar();
  loading(false);
}

async function deletePost(postId) {
  console.log("DELETE POST", postId);

  loading(true);
  var result = await Api.send("/posts/delete", {postId: postId});
  loading(false);
  new Toast(result);
  if (!result.result) return;
  S.mainFrame.reload();
}

async function deleteComment(commentId, postId) {
  console.log("DELETE COMMENT", commentId);

  loading(true);
  var result = await Api.send("/posts/deleteComment", {commentId: commentId});
  loading(false);
  new Toast(result);
  if (!result.result) return;
  await togglePostComment(postId, true);
}

function buildComments(container, list, postId) {
  container.innerHTML = "";

  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    container.innerHTML += `
      <div class="comment">
        <img class="post-avatar" src="${c.avatar}">
        <p class="display-name">${c.displayName}</p>
        <p>${c.comment}</p>
        <i class="fas fa-trash delete-comment" onclick="deleteComment('${c.commentId}', '${postId}')"></i>
      </div>
    `;
  }
}
