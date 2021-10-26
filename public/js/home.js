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
      showProfile: showProfile
    }
  });

  S.newPostHandler = new NewPostHandler();
  S.profileHandler = new ProfileHandler();
  S.mainFrame = new MainFrame();

  refreshUserAvatar();
  loading(false);
}
