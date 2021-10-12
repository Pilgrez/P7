document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#btn-login').addEventListener('click', login);
  document.querySelector(`#btn-register`).addEventListener('click', register);
  loading(false);
});

/*
  Login
*/

async function login() {
  if (!verifyForm(['#email', '#password'])) return;

  loading(true);
  var cred = getForm(['#email', '#password']);
  console.log(cred);

  var body = await Api.send('/login', cred);
  console.log(body);
  if (!body.result) {
    setError(body.info);
    loading(false);
    return;
  }

  postLogin(cred);
}

/*
  Register
*/

async function register() {
  if (!verifyForm(['#email', '#password'])) return;

  loading(true);
  var cred = getForm(['#email', '#password']);
  console.log(cred);

  var body = await Api.send('/register', cred);
  console.log(body);
  if (!body.result) {
    setError(body.info);
    loading(false);
    return;
  }

  postLogin(cred);
}

/*
  Post
*/
async function postLogin(body) {
  // make request to dashboard home
  document.querySelector('#post').innerHTML = `
    <form action="/social" method="POST" id="post_form">
      <input type="hidden" name="email" value="${body.email}">
      <input type="hidden" name="password" value="${body.password}">
    </form>
  `;
  document.querySelector('#post_form').submit();
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
  document.querySelector('#loading').style.display = show === true ? "block" : "none";
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
