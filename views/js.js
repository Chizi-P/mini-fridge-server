


function check() {
    var password = document.getElementById("password")
    var checkPassword = document.getElementById("checkPassword")
    var a = document.getElementsByClassName("xx")
    var message = document.getElementById("message")
    if (password.value != checkPassword.value) {
        console.log("密碼不一樣")
        message.innerText = "密碼不一樣";
    } else {
        console.log("一樣")
        message.innerText = "一樣";
    }
}


function myFunction() {
    alert("The value of the input field was changed.");
  }