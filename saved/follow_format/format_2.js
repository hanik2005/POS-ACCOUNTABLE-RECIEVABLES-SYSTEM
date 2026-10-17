//JSON STRING TO OBJECT
// const jSON = '{"name": "Nick", "age": 21}';

// const obj = JSON.parse(jSON);

// console.log("OBJECT: " + obj.name);

//OBJECT TO JSON STRING

// const jsonObj = {name: "Nick", age: 21};
// const jsonString = JSON.stringify(jsonObj);
// console.log(jsonString);

import { deleteModal } from "./module/delete.js";
import { updateModal } from "./module/update.js";
import { viewModal } from "./module/view.js";

const baseAPI = "http://localhost/javascript-api/api";
sessionStorage.setItem("baseAPI", baseAPI);

let courses = [];




//THIS IS THE CLIENT SIDE TO MANIPULTE DATA
document.addEventListener("DOMContentLoaded", ()=>{

    displayCourses();

    displayStudents();

    document.getElementById("submitBtn").addEventListener("click", ()=>{
            insertStudent();
    }
)
    
})
//GET
const getGreetingsFromAPI = async(nameInput, ageInput) =>{

    //nag request pata mag pending sha if dili ka mogamit og await
    //where using 
    const response =  await axios.get(`${baseAPI}/greetings.php`,{
        params: {name: nameInput, age: ageInput} //it will get the data to the greetings.php using the params properties
    });

    if(response.status == 200){
        console.log(response.data);
    }else{
        Swal.fire("error");
    }

    
}

//POST
const getGreetingsFromAPI2 = async(nameInput, ageInput) =>{

    const skill = {language: "Java", level: 3};

    const formData = new FormData();
    formData.append("name", nameInput);
    formData.append("age", ageInput);
    formData.append("skill", JSON.stringify(skill));

    const response = await axios({
        url: `${baseAPI}/greetings_post.php`,
        method: "POST",
        data: formData
    })
    

    if(response.status == 200){
        const student = response.data;

        console.log(student.name);
        console.log(student.age);
        console.log(student.language);
        console.log(student.level);
    }else{
        Swal.fire("error");
    }

    
}

const displayStudents = async() =>{
    
    

    //nag request pata mag pending sha if dili ka mogamit og await
    //where using 
    const response =  await axios.get(`${baseAPI}/students.php`,{
        params: await {operation: "getAllStudents"} //it will get the data to the greetings.php using the params properties
    });

    if(response.status == 200){
        console.log(response.data);
        displayStudentsTable(response.data);
    }else{
        Swal.fire("error");
    }
}

const displayStudentsTable = (students)=>{
    const main = document.getElementById("main-div");
    main.innerHTML = ""; //not creating more table
    const table = document.createElement("table");
    table.classList.add("table", "table-hover", "table-striped", "table-sm");
    const tHead = document.createElement("thead");
    tHead.innerHTML = `
        <tr>
            <th>ID</th>
            <th>Last Name</th>
            <th>First Name</th>
            <th>Course</th>
            <th>Address</th>
            <th>Action</th>
        </tr>
    `;
    table.appendChild(tHead);

    const tBody = document.createElement("tbody");
    students.forEach(student => {
        const tr = document.createElement("tr");
        tr.innerHTML = 
        `
            <td>${student.stud_school_id}</td>
            <td>${student.stud_last_name}</td>
            <td>${student.stud_first_name}</td>
            <td>${student.crs_code}</td>
            <td>${student.stud_address}</td>
            <td>
            <button type="button" class="btn btn-primary btn-sm btn-view">VIEW</button>
            <button type="button" class="btn btn-success btn-sm btn-update">UPDATE</button>
            <button type="button" class="btn btn-danger btn-sm btn-delete">DELETE</button>
            </td>
        `;
        tBody.appendChild(tr);
        tr.querySelector(".btn-view").addEventListener("click", ()=>{
                console.log("Hello",student.stud_id);
                viewModal(student.stud_id);
        })
        tr.querySelector(".btn-update").addEventListener("click", ()=>{
                updateModal(student.stud_id, courses, displayStudents);
                    //viewModal(student.stud_id);
        })
        tr.querySelector(".btn-delete").addEventListener("click", ()=>{
                deleteModal(student.stud_id, displayStudents);
                //Swal.fire("DELETE");
                    //viewModal(student.stud_id);
        })
    });
    table.appendChild(tBody);
    main.appendChild(table);
    
}

const displayCourses = async()=>{
    const select = document.getElementById("course_id");


    const response =  await axios.get(`${baseAPI}/courses.php`,{
        params: {operation: "getAllCourses"} 
    });

    if(response.status == 200){
        courses = response.data;
        courses.forEach(course=>{
            let op = document.createElement("option");
            op.innerText = course.crs_title;
            op.value = course.crs_id;
            select.appendChild(op);
        });
    }else{
        Swal.fire("error");
    }

    
}

const insertStudent = async()=>{
    const jsonData = {
        schoolId: document.getElementById("schoolIdInput").value,
        lastName: document.getElementById("lastNameInput").value,
        firstName: document.getElementById("firstNameInput").value,
        courseId: document.getElementById("course_id").value,
        address: document.getElementById("addressInput").value,
        dob: document.getElementById("dateDOBInput").value,
        balance: document.getElementById("balanceInput").value
    };

    const formData = new FormData();
    formData.append("operation", "insertStudents");
    formData.append("json", JSON.stringify(jsonData));
    
    const response = await axios({
        url: `${baseAPI}/students.php`,
        method: "POST",
        data: formData
    });

    console.log(response.data);
    if(response.data == 1){
        displayStudents();
        Swal.fire("student successfully save");
    }else{
        Swal.fire("ERROR");
    }
}
