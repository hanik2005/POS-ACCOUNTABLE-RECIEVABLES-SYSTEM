<?php
require_once __DIR__ . "/config-cors.php";

class ProductCategory
{
    function insertProductCategory($json)
    {
        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "INSERT INTO product_category
                (category_name, description, status)
                VALUES
                (:categoryName, :description, :status)";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(":categoryName", $json['categoryName']);
        $stmt->bindParam(":description", $json['description']);
        $stmt->bindParam(":status", $json['status']);

        $stmt->execute();

        $returnValue = 0;

        if ($stmt->rowCount() > 0) {
            $returnValue = 1;
        }

        echo json_encode($returnValue);
    }

    function getAllProductCategories()
    {
        include "connection-pdo.php";

        $sql = "SELECT *
                FROM product_category
                ORDER BY category_name";

        $stmt = $conn->prepare($sql);
        $stmt->execute();

        $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($rs);
    }

    function getProductCategory($json)
    {
        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "SELECT *
                FROM product_category
                WHERE category_id = :categoryId";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(":categoryId", $json['categoryId']);

        $stmt->execute();

        $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($rs);
    }

    function updateProductCategory($json)
    {
        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "UPDATE product_category
                SET category_name = :categoryName,
                    description = :description,
                    status = :status
                WHERE category_id = :categoryId";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(":categoryName", $json['categoryName']);
        $stmt->bindParam(":description", $json['description']);
        $stmt->bindParam(":status", $json['status']);
        $stmt->bindParam(":categoryId", $json['categoryId']);

        $stmt->execute();

        $returnValue = 0;

        if ($stmt->rowCount() > 0) {
            $returnValue = 1;
        }

        echo json_encode($returnValue);
    }

    function deleteProductCategory($json)
    {
        include "connection-pdo.php";

        $json = json_decode($json, true);

        // Soft delete because product categories
        // are referenced by PRODUCTS.
        $sql = "UPDATE product_category
                SET status = 'INACTIVE'
                WHERE category_id = :categoryId";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(":categoryId", $json['categoryId']);

        $stmt->execute();

        $returnValue = 0;

        if ($stmt->rowCount() > 0) {
            $returnValue = 1;
        }

        echo json_encode($returnValue);
    }
}


if ($_SERVER['REQUEST_METHOD'] == 'GET') {

    $operation = isset($_GET['operation']) ? $_GET['operation'] : "";
    $json = isset($_GET['json']) ? $_GET['json'] : "";

} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {

    $operation = isset($_POST['operation']) ? $_POST['operation'] : "";
    $json = isset($_POST['json']) ? $_POST['json'] : "";
}


$productCategory = new ProductCategory();


switch ($operation) {

    case "getAllProductCategories":
        $productCategory->getAllProductCategories();
        break;

    case "getProductCategory":
        $productCategory->getProductCategory($json);
        break;

    case "insertProductCategory":
        $productCategory->insertProductCategory($json);
        break;

    case "updateProductCategory":
        $productCategory->updateProductCategory($json);
        break;

    case "deleteProductCategory":
        $productCategory->deleteProductCategory($json);
        break;

    default:
        echo json_encode([
            "error" => "Invalid operation"
        ]);
        break;
}

?>