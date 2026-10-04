import { login } from "./module/login.js";

const baseApiUrl = "http://localhost/pos_ar_system/api";
sessionStorage.setItem("baseAPI", baseApiUrl);

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


