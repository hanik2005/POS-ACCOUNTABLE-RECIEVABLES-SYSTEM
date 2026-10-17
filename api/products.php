<?php
require_once __DIR__ . "/config-cors.php";

class Product
{
    function insertProduct($json)
    {
        include "connection-pdo.php";

        $json = json_decode($json, true);

        $product = $json['product'];

        try {

            $sql = "INSERT INTO products
                    (
                        barcode,
                        product_name,
                        description,
                        unit_price,
                        unit_id,
                        category_id,
                        status
                    )
                    VALUES
                    (
                        :barcode,
                        :productName,
                        :description,
                        :unitPrice,
                        :unitId,
                        :categoryId,
                        :status
                    )";

            $stmt = $conn->prepare($sql);

            $stmt->bindParam(":barcode", $product['barcode']);
            $stmt->bindParam(":productName", $product['productName']);
            $stmt->bindParam(":description", $product['description']);
            $stmt->bindParam(":unitPrice", $product['unitPrice']);
            $stmt->bindParam(":unitId", $product['unitId']);
            $stmt->bindParam(":categoryId", $product['categoryId']);
            $stmt->bindParam(":status", $product['status']);

            $stmt->execute();

            return json_encode(1);

        } catch (Exception $e) {

            return json_encode(0);
        }
    }


    // GET ALL PRODUCTS
    function getAllProducts()
    {
        include "connection-pdo.php";

        $sql = "SELECT
                    p.*,
                    u.unit_name,
                    c.category_name
                FROM products p

                LEFT JOIN unit_tbl u
                    ON p.unit_id = u.unit_id

                LEFT JOIN product_category c
                    ON p.category_id = c.category_id

                ORDER BY p.product_name";

        $stmt = $conn->prepare($sql);

        $stmt->execute();

        $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($rs);
    }


    // GET SINGLE PRODUCT
    function getProduct($json)
    {
        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "SELECT
                    p.*,
                    u.unit_name,
                    c.category_name
                FROM products p

                LEFT JOIN unit_tbl u
                    ON p.unit_id = u.unit_id

                LEFT JOIN product_category c
                    ON p.category_id = c.category_id

                WHERE p.product_id = :productId";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(
            ":productId",
            $json['productId']
        );

        $stmt->execute();

        $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($rs);
    }


    // UPDATE PRODUCT
    function updateProduct($json)
    {
        include "connection-pdo.php";

        $json = json_decode($json, true);

        $product = $json['product'];

        try {

            $sql = "UPDATE products

                    SET
                        barcode = :barcode,
                        product_name = :productName,
                        description = :description,
                        unit_price = :unitPrice,
                        unit_id = :unitId,
                        category_id = :categoryId,
                        status = :status

                    WHERE product_id = :productId";

            $stmt = $conn->prepare($sql);

            $stmt->bindParam(
                ":barcode",
                $product['barcode']
            );

            $stmt->bindParam(
                ":productName",
                $product['productName']
            );

            $stmt->bindParam(
                ":description",
                $product['description']
            );

            $stmt->bindParam(
                ":unitPrice",
                $product['unitPrice']
            );

            $stmt->bindParam(
                ":unitId",
                $product['unitId']
            );

            $stmt->bindParam(
                ":categoryId",
                $product['categoryId']
            );

            $stmt->bindParam(
                ":status",
                $product['status']
            );

            $stmt->bindParam(
                ":productId",
                $product['productId']
            );

            $stmt->execute();

            return json_encode(1);

        } catch (Exception $e) {

            return json_encode(0);
        }
    }


    // DELETE PRODUCT
    function deleteProduct($json)
    {
        include "connection-pdo.php";

        $json = json_decode($json, true);

        // Soft delete
        $sql = "UPDATE products
                SET status = 'INACTIVE'
                WHERE product_id = :productId";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(
            ":productId",
            $json['productId']
        );

        $stmt->execute();

        $returnValue = 0;

        if ($stmt->rowCount() > 0) {
            $returnValue = 1;
        }

        echo json_encode($returnValue);
    }
}


// GET
if ($_SERVER['REQUEST_METHOD'] == 'GET') {

    $operation = $_GET['operation'];

    $json = isset($_GET['json'])
        ? $_GET['json']
        : "";


// POST
} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {

    $operation = $_POST['operation'];

    $json = isset($_POST['json'])
        ? $_POST['json']
        : "";
}


$product = new Product();


switch ($operation) {

    case "getAllProducts":

        $product->getAllProducts();

        break;


    case "getProduct":

        $product->getProduct($json);

        break;


    case "insertProduct":

        echo $product->insertProduct($json);

        break;


    case "updateProduct":

        echo $product->updateProduct($json);

        break;


    case "deleteProduct":

        $product->deleteProduct($json);

        break;
}

?>