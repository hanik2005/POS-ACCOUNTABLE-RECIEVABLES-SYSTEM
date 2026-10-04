<?php
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');

    class Student{
        function insertStudents($json){ //when you insert something you need a 
        //json or value user want so we need a parameter of the value that contains
            include "connectionPDO.php";

            $json = json_decode($json, true); //THIS SECOND PARAMATER TRUE MEANS THEY WANT RETURN THE ASSOCIATIVE ARRAY NOT THE INDEX
            $sql = "INSERT INTO tblstudents(stud_school_id, stud_last_name, stud_first_name, stud_course_id, 
            stud_address, stud_dob, stud_balance) VALUES
            (:schoolId, :lastName, :firstName, :courseId, :address, :dob, :balance)";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam("schoolId", $json['schoolId']);
            $stmt->bindParam("lastName", $json['lastName']);
            $stmt->bindParam("firstName", $json['firstName']);
            $stmt->bindParam("courseId", $json['courseId']);
            $stmt->bindParam("address", $json['address']);
            $stmt->bindParam("dob", $json['dob']);
            $stmt->bindParam("balance", $json['balance']);
            $stmt->execute();

            $returnValue = 0;

            if($stmt->rowCount() > 0){
                $returnValue = 1;
            }

            echo json_encode($returnValue);
            //$rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            
        }

        function getAllStudents(){ 
            //connect to the database
            include "connectionPDO.php";

            $sql = "SELECT a.*, b.crs_code FROM tblstudents a
             INNER JOIN tblcourses b ON a.stud_course_id = b.crs_id 
             ORDER BY a.stud_last_name";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute();
            $rs = $stmt->fetchAll(PDO::FETCH_ASSOC); //RETURN ASSOCIATIVE ARRAY
            
            echo json_encode($rs);
        }


        function getStudent($json){
            include "connectionPDO.php";

            
            $json = json_decode($json, true);

            $sql = "SELECT a.*, b.crs_code FROM tblstudents a INNER JOIN 
            tblcourses b ON a.stud_course_id = b.crs_id WHERE a.stud_id = :studId";



            // SELECT t1.column1, t2.column2, t3.column3
            // FROM table1 t1
            // INNER JOIN table2 t2 ON t1.common_id = t2.common_id
            // INNER JOIN table3 t3 ON t2.common_id = t3.common_id WHERE t1.id = ?;   


            $stmt = $conn->prepare($sql);
            $stmt->bindParam(":studId", $json['studId']);
            $stmt->execute();
            $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

           
            echo json_encode($rs);
        }

        function updateStudent($json){
            include "connectionPDO.php";

            
            $json = json_decode($json, true);

            $sql = "UPDATE tblstudents SET stud_school_id = :schoolId, stud_last_name = 
            :lastName, stud_first_name = :firstName, stud_course_id = :courseId, stud_address = 
            :address, stud_dob =:dob, stud_balance=:balance WHERE stud_id = :studId";

            // UPDATE employees e
            // INNER JOIN departments d ON e.department_id = d.id
            // SET e.salary = e.salary * 1.10
            // WHERE d.name = 'Engineering';   


            $stmt = $conn->prepare($sql);
            $stmt ->bindParam(":schoolId", $json['schoolId']);
            $stmt ->bindParam(":lastName", $json['lastName']);
            $stmt ->bindParam(":firstName", $json['firstName']);
            $stmt ->bindParam(":courseId", $json['courseId']);
            $stmt ->bindParam(":address", $json['address']);
            $stmt ->bindParam(":dob", $json['dob']);
            $stmt ->bindParam(":balance", $json['balance']);
            $stmt ->bindParam(":studId", $json['studId']);
            $stmt->execute();

            $returnValue = 0;

            if($stmt->rowCount() > 0){
                $returnValue = 1;
            }

            echo json_encode($returnValue);
            //$rs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        function deleteStudent($json){
            include "connectionPDO.php";

            $json = json_decode($json, true);

            $sql = "DELETE FROM tblstudents WHERE stud_id = :studId";

            // DELETE o
            // FROM Orders o
            // INNER JOIN Customers c ON o.customer_id = c.customer_id
            // WHERE c.status = 'inactive';   

            $stmt = $conn->prepare($sql);
            $stmt->bindParam(":studId", $json['studId']);
            $stmt->execute();

            $returnValue = 0;

            if($stmt->rowCount() > 0){
                $returnValue = 1;
            }

            echo json_encode($returnValue);

        }

    }


    //SUBMITTED BY THE CLIENT THE OPERATION AND THE JSON
    if($_SERVER['REQUEST_METHOD'] == 'GET'){
        $operation = $_GET['operation'];
        $json = isset($_GET['json']) ? $_GET['json'] : "";
    }else if($_SERVER['REQUEST_METHOD'] == 'POST'){
        $operation  = $_POST['operation'];
        $json = isset($_POST['json']) ? $_POST['json'] : "";
    }


    $student = new Student();
    switch($operation){
        case "getAllStudents":
            echo $student->getAllStudents();
            break;
        case "insertStudents":
            echo $student->insertStudents($json);
            break;
        case "getStudent":
            echo $student->getStudent($json);
            break;
        case "updateStudent":
            echo $student->updateStudent($json);
            break;
        case "deleteStudent":
            echo $student->deleteStudent($json);
            break;
    }


?>