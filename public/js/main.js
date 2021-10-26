function refreshUserAvatar() {
  document.querySelector('#nav-avatar').src = S.app.user.avatar;
}

function showProfile() {
  S.profileHandler.showModal();
}

function moveTo(path) {
  document.querySelector('body').innerHTML += `<form action="${path}" id="moveto"></form>`;
  document.querySelector('#moveto').submit();
}

/* Comment */
async function togglePostComment(postId, force=false) {
  var container = document.querySelector(`#post-${postId} #comments-container`);

  // if displayed hide
  console.log(container.style.display);
  if (container.style.display == "block" && !force) {
    container.style.display = "none";
    return;
  }


  // load comment
  loading(true);
  var result = await Api.send("/posts/getComments", {postId: postId});
  if (!result.result) {
    new Toast(result);
    loading(false);
    return;
  }

  buildComments(container.querySelector('.comments-list'), result.comments, postId);
  container.style.display = "block";
  loading(false);
}

function buildComments(container, list) {
  container.innerHTML = "";

  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    container.innerHTML += `
      <div class="comment">
        <img class="post-avatar" src="${c.avatar}">
        <p class="display-name">${c.displayName}</p>
        <p>${c.comment}</p>
      </div>
    `;
  }
}

async function commentPost(postId) {
  var input = document.querySelector(`#post-${postId} #comment-input`);
  if (input.value == "") {
    input.classList.add('is-invalid');
    return;
  }

  loading(true);
  input.classList.remove('is-invalid');
  var result = await Api.send('/posts/comment', {postId:postId, comment:input.value});
  console.log("post result");
  loading(false);
  new Toast(result);
  if (!result.result) return;

  input.value = "";
  await togglePostComment(postId, true);
}

/* Like */
async function togglePostLike(postId) {
  loading(true);
  var result = await Api.send("/posts/like", {postId:postId});
  if (!result.result) {
    new Toast(result);
    loading(false);
    return;
  }

  for (var i = 0; i < S.app.posts.length; i++) {
    if (S.app.posts[i].postId == postId) {
      if (result.status == "liked") S.app.posts[i].likes++;
      if (result.status == "unliked") S.app.posts[i].likes--;
      break;
    }
  }

  document.querySelector(`#post-${postId} .fa-heart`).style.color = result.status == "liked" ? "red" : "";
  loading(false);
}

/* Profile Handler */
class ProfileHandler {

  constructor() {
    this.modal = document.querySelector('#profile-modal');
    this.displayName = this.modal.querySelector('#display-name');
    this.email = this.modal.querySelector('#email');
    this.avatar = this.modal.querySelector('#avatar');

    document.querySelector('#nav-avatar').addEventListener('click', () => this.showModal());
    this.modal.querySelector('.btn-close').addEventListener('click', () => this.closeModal());
    this.modal.querySelector('#delete').addEventListener('click', () => this.deleteAccount());
    this.modal.querySelector('#logout').addEventListener('click', () => moveTo('/'));
    this.modal.querySelector('#save').addEventListener('click', () => this.save());

    this.bind();
  }

  showModal() {
    this.modal.classList.add('show');
    this.modal.style.display = "block";
  }

  closeModal() {
    this.modal.classList.remove('show');
    this.modal.style.display = "none";
  }

  bind() {
    this.displayName.value = S.app.user.displayName;
    this.email.value = S.app.user.email;
  }

  async save() {
    if (!this.verify()) return;

    loading(true);
    var formData = new FormData();
    formData.append("displayName", this.displayName.value);
    formData.append("email", this.email.value);
    formData.append("x-token", S.app.user.token);
    if (this.avatar.files.length >= 1) formData.append("image", this.avatar.files[0]);

    var result = await Api.send('/users/update', formData, true);
    new Toast(result);
    loading(false);
    if (!result.result) return;

    S.app.user.displayName = this.displayName.value;
    S.app.user.email = this.email.value;
    if (this.avatar.files.length >= 1) S.app.user.avatar = result.avatar;

    this.bind();
    refreshUserAvatar();
    this.closeModal();
  }

  verify() {
    var exit = true;
    if (this.displayName.value == "") {
      this.displayName.classList.add('is-invalid');
      exit = false;
    } else {
      this.displayName.classList.remove('is-invalid');
    }

    if (this.email.value == "") {
      this.email.classList.add('is-invalid');
      exit = false;
    } else {
      this.email.classList.remove('is-invalid');
    }
    return exit;
  }

  async deleteAccount() {
    loading(true);
    var result = await Api.send('/users/deleteAccount', {});
    console.log("DELETE", result);
    new Toast(result);
    loading(false);
    if (!result.result) return;
    moveTo('/');
  }

}

/* New Post Handler */
class NewPostHandler {

  static typeText = "text";
  static typeImage = "image";

  constructor() {
    this.modal = document.querySelector('#new-post-modal');
    this.modal.querySelector('.btn-close').addEventListener('click', (evt) => this.closeModal(true));
    this.modal.querySelector('#create').addEventListener('click', async (evt) => await this.create());
    this.textarea = this.modal.querySelector('#post-content');
    this.imageInput = this.modal.querySelector('#post-file');
    document.querySelector('.new-post').addEventListener('click', (evt) => this.onClick(evt));
  }

  onClick(evt) { this.showModal(); }

  showModal() {
    this.modal.classList.add('show');
    this.modal.style.display = "block";
  }

  closeModal(reset=false) {
    this.modal.classList.remove('show');
    this.modal.style.display = "none";
    if (reset) this.textarea.value = "";
  }

  async create() {
    if (!this.verify()) return;
    loading(true);

    var result = await this.sendPost();

    loading(false);
    new Toast(result);
    if (!result.result) return;
    this.closeModal(true);
    S.mainFrame.reload();
  }

  verify() {
    var type = this.getType();
    console.log("GIVEN TYPE", type);

    if (type == NewPostHandler.typeImage) {
      if (this.imageInput.files.length < 1) {
        this.imageInput.classList.add('is-invalid');
        return false;
      }
      this.imageInput.classList.remove('is-invalid');
      return true;
    } else {
      if (this.textarea.value == "") {
        this.textarea.classList.add('is-invalid');
        return false;
      }
      this.textarea.classList.remove('is-invalid');
      return true;
    }
  }

  async sendPost() {
    if (this.getType() == NewPostHandler.typeText) {
      var post = { type:"text", content:this.textarea.value };
      var result = await Api.send('/posts/create', post);
      console.log(result);
      return result;
    } else {
      var formData = new FormData();
      formData.append("type", "image");
      formData.append("x-token", S.app.user.token);
      formData.append("image", this.imageInput.files[0]);
      console.log("FormDATA", formData);
      var result = await Api.send('/posts/create', formData, true);
      console.log("IMG POST", result);
      return result;
    }
  }

  getType() {
    var type = this.modal.querySelector('ul.nav-tabs').querySelector('.active').href.split('#')[1];
    console.log("SELECTED TYPE", type);
    return type == "new_post_img" ? NewPostHandler.typeImage : NewPostHandler.typeText;
  }
}

function drawEmptyPosts() {
  document.querySelector('#posts-container').innerHTML = `
    <div class="">
      <img src="/img/no_posts.svg">
      <p class="lead">No Post Yet !</p>
      <p>Be the first to post on your society social network.</p>
    </div>
  `;
}

/*
  Notifier
*/

class Toast {
  constructor(data) {
    this.id = generateId(12);
    this.color = data.result ? "success" : "danger";
    this.title = data.result ? "Success" : "Error";
    this.msg = data.info;
    this.data = data;

    this.html = `
      <div class="toast show" role="alert" id="toast-${this.id}">
        <div class="toast-header bg-${this.color}">
          <i class="ai-lock me-2"></i>
          <span class="me-auto">${this.title}</span>
          <button type="button" class="btn-close ms-2 mb-1"></button>
        </div>
        <div class="toast-body">${data.info}</div>
      </div>
    `;

    document.querySelector('#toast-container').innerHTML += this.html;
    this.elem = document.querySelector(`#toast-${this.id}`);
    this.elem.querySelector('.btn-close').addEventListener('click', () => this.destroy());

    this.timeout = setTimeout(() => this.destroy(), 2500);
  }

  destroy() {
    this.elem.remove();
    clearTimeout(this.timeout)
  }

}

/*
  Main Frame
*/
class MainFrame {

  constructor() {
    this.posts = [];
    this.elem = document.querySelector("#main-content");
    setTimeout(() => this.reload(), 1);
  }

  async reload() {
    loading(true);

    var body = await Api.send('/posts/get', {});
    console.log(body);
    if (!body.result) {
      new Toast(body);
      loading(false);
      return;
    }

    S.app.posts = body.posts;
    loading(false);
  }
}

/*
  Form
*/
function verifyForm(list) {
  var exit = true;

  for (var i = 0; i < list.length; i++) {
    var elem = document.querySelector(list[i]);
    if (elem.value == "") {
      exit = false;
      elem.classList.add('is-invalid')
    } else {
      elem.classList.remove('is-invalid')
    }
  }
  return exit;
}

function getForm(list) {
  var obj = {};

  for (var i = 0; i < list.length; i++) {
    var elem = document.querySelector(list[i]);
    var key = elem.getAttribute('z-key') === "" ? elem.getAttribute('name') : elem.getAttribute('z-key');
    obj[key] = elem.value;
  }

  return obj;
}

/*
  UI
*/

function loading(show) {
  // use flex -> just dont show it, but dont change nav layout
  document.querySelector('#nav-loading').style.display = show === true ? "block" : "none";
  document.querySelector('#nav-avatar').style.marginLeft = show === true ? "20px" : "auto";
}

function setError(err) { document.querySelector('#error').innerHTML = err; }
function clearError() { document.querySelector('#error').innerHTML = ""; }

/*
  Network
*/

class Api {
  constructor() {}


  static send(url, body, raw=false) {
    return new Promise((resolve, reject) => {
      if (!raw) body['x-token'] = S.app.user.token;

      var xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = function() {
          if (this.readyState == 4 && this.status == 200) {
             try {
               var response = JSON.parse(xhttp.responseText);
               resolve(response);
             } catch (e) {
               console.log(e);
               resolve({result:false, info:e});
             }
          }
      };
      xhttp.open("POST", url, true);
      if (!raw) xhttp.setRequestHeader("Content-Type","application/json");
      xhttp.send(raw ? body : JSON.stringify(body));
    });
  }

}

function generateId(size) {
  const possible = "azertyuiopqsdfghjklmwxcvbn7984561230";
  var id = "";
  for (var i = 0; i < size; i++) {
    id += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return id;
}
