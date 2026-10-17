import { login } from "./module/login.js";
import { baseAPI } from "./config.js";

sessionStorage.setItem("baseAPI", baseAPI);

document.addEventListener("DOMContentLoaded", ()=>{
 const loginBtn = document.getElementById("button-login");



 loginBtn.addEventListener("click", ()=>{
    const userData = {
        username: document.getElementById("username").value,
        password: document.getElementById("password").value,
    };
    login(userData)
 });
    
})
