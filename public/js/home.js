document.addEventListener('DOMContentLoaded', start);

var S = {};

function start() {
  //drawEmptyPosts();
  S.newPostHandler = new NewPostHandler();
  S.mainFrame = new MainFrame();

  S.app = new Vue({
    el: "#main-content",
    data: {
      posts: []
    },
    methods: {
      togglePostLike: togglePostLike
    }
  });

  loading(false);
}

async function togglePostLike(postId) {
  loading(true);
  console.log("LIKE POST", postId);
  var result = await Api.send("/posts/like", {postId:postId});

  console.log("POST LIKE RESULT", result);
}

/* New Post Handler */
class NewPostHandler {
  constructor() {
    this.modal = document.querySelector('#new-post-modal');
    this.modal.querySelector('.btn-close').addEventListener('click', (evt) => this.closeModal(true));
    this.modal.querySelector('#create').addEventListener('click', async (evt) => await this.create());
    this.textarea = this.modal.querySelector('#post-content');
    document.querySelector('.new-post').addEventListener('click', (evt) => this.onClick(evt));
  }

  onClick(evt) {
    console.log("New Post: click");
    this.showModal();
  }

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

    var post = { content:this.textarea.value };
    var result = await Api.send('/posts/create', post);
    console.log(result);

    loading(false);
    new Toast(result);
    if (!result.result) return;
    this.closeModal(true);
    S.mainFrame.reload();
  }

  verify() {
    if (this.textarea.value == "") {
      this.textarea.classList.add('is-invalid');
      return false;
    }

    this.textarea.classList.remove('is-invalid');
    return true;
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
  Post


class Post {

  constructor(data) {
    this.elem = null;
    this.userId = data.userId;
    this.type = data.type;
    this.content = data.content;
    this.creationDate = new Date(data.creationDate);
    this.postId = data.postId;
  }

  build(elem) {
    var html = `
      <div class="card card-hover post" id="post-${this.postId}">

        <div class="card-body">
          <img class="post-avatar" src="/users/${this.userId}.svg">
          <p class="post-date">${this.getDate()}</p>
          <p class="card-text fs-sm">${this.content}</p>
        </div>

        <div class="card-footer fs-sm text-muted">
          <i class="fal fa-heart like"></i>
          <i class="fal fa-comment"></i>
        </div>

      </div>
    `;
    elem.innerHTML += html;
    this.elem = document.querySelector(`#post-${this.postId}`);
    this.listen();
  }

  getDate() {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return this.creationDate.toLocaleDateString(options);
  }

  listen() {

  }

}
*/

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


  static send(url, body) {
    return new Promise((resolve, reject) => {
      body['x-token'] = document.querySelector('#user_token').value;

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
      xhttp.setRequestHeader("Content-Type", "application/json");
      xhttp.send(JSON.stringify(body));
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
