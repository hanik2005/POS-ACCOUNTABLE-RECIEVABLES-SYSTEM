-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 09, 2026 at 12:30 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `pos_ar_database`
--

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `customer_id` int(11) NOT NULL,
  `customer_name` varchar(150) NOT NULL,
  `contact_number` varchar(30) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `credit_limit` decimal(12,2) NOT NULL DEFAULT 0.00,
  `group_days_id` int(11) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`customer_id`, `customer_name`, `contact_number`, `email`, `address`, `credit_limit`, `group_days_id`, `status`) VALUES
(1, 'ABC Trading', '09171234567', 'abc@trading.com', 'Cagayan de Oro City', 50000.00, 3, 'ACTIVE'),
(2, 'XYZ Store', '09181234567', 'xyz@store.com', 'Iligan City', 30000.00, 2, 'ACTIVE'),
(5, 'Nick Charles D. Clarito', '09944719534', 'nickcharlesclarito@gmail.com', 'dsadsadsaddsadsa', 10000000.00, 2, 'ACTIVE'),
(6, 'Maria Cristina D. Clarito', '09262360968', 'maria@gmail.com', 'fasfafaf', 99999999.98, 3, 'ACTIVE'),
(7, 'Pitok Batolata', '09877418762', 'batolata@gmail.com', 'Quezon City', 5000.00, 5, 'ACTIVE');

-- --------------------------------------------------------

--
-- Table structure for table `group_days`
--

CREATE TABLE `group_days` (
  `id` int(11) NOT NULL,
  `days_name` varchar(50) NOT NULL,
  `days_due` int(11) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `group_days`
--

INSERT INTO `group_days` (`id`, `days_name`, `days_due`, `status`) VALUES
(2, '15 Days', 15, 'ACTIVE'),
(3, '30 Days', 30, 'ACTIVE'),
(4, '60 Days', 60, 'ACTIVE'),
(5, 'TRUSTED CUSTOMER', 100, 'ACTIVE'),
(6, 'dsddasda', 90, 'ACTIVE'),
(7, 'dasdafafa', 120, 'ACTIVE'),
(8, 'kiloooooo', 2, 'ACTIVE'),
(9, '70 days', 70, 'ACTIVE'),
(10, 'Average Trust Customer(50 Days)', 50, 'ACTIVE');

-- --------------------------------------------------------

--
-- Table structure for table `invoice`
--

CREATE TABLE `invoice` (
  `invoice_id` int(11) NOT NULL,
  `sales_id` int(11) NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `due_date` date NOT NULL,
  `amount_due` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` varchar(20) NOT NULL DEFAULT 'UNPAID'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `invoice`
--

INSERT INTO `invoice` (`invoice_id`, `sales_id`, `invoice_number`, `due_date`, `amount_due`, `status`) VALUES
(13, 20, 'INV-2026-0001', '2027-01-11', 475.00, 'UNPAID'),
(14, 22, 'INV-2026-0014', '2026-10-18', 450.00, 'UNPAID'),
(15, 23, 'INV-2026-0015', '2026-11-02', 75.00, 'UNPAID'),
(16, 24, 'INV-2026-0016', '2026-10-18', 94.97, 'UNPAID'),
(17, 25, 'INV-2026-0017', '2026-11-03', 375.00, 'PARTIAL'),
(18, 26, 'INV-2026-0018', '2026-11-03', 9.97, 'UNPAID'),
(19, 27, 'INV-2026-0019', '2026-10-19', 9.97, 'PAID'),
(20, 28, 'INV-2026-0020', '2027-01-12', 195.00, 'PAID'),
(21, 29, 'INV-2026-0021', '2026-10-19', 135.00, 'PAID'),
(22, 30, 'INV-2026-0022', '2027-01-12', 175.00, 'UNPAID'),
(23, 31, 'INV-2026-0023', '2026-10-19', 505.00, 'PAID'),
(24, 32, 'INV-2026-0024', '2026-11-03', 505.00, 'PAID'),
(25, 33, 'INV-2026-0025', '2026-10-19', 245.00, 'PARTIAL'),
(27, 35, 'INV-2026-0026', '2027-01-12', 109.97, 'UNPAID'),
(29, 37, 'INV-2026-0028', '2027-01-12', 205.00, 'UNPAID'),
(30, 38, 'INV-2026-0030', '2026-10-19', 1174.97, 'PARTIAL'),
(31, 39, 'INV-2026-0031', '2026-11-03', 244.97, 'UNPAID'),
(32, 40, 'INV-2026-0032', '2027-01-12', 244.97, 'UNPAID'),
(33, 41, 'INV-2026-0033', '2026-10-19', 394.97, 'UNPAID'),
(34, 42, 'INV-2026-0034', '2026-11-03', 184.97, 'UNPAID'),
(35, 43, 'INV-2026-0035', '2027-01-12', 505.00, 'PARTIAL'),
(36, 44, 'INV-2026-0036', '2027-01-12', 184.97, 'UNPAID');

-- --------------------------------------------------------

--
-- Table structure for table `payments_dtl`
--

CREATE TABLE `payments_dtl` (
  `payment_detail_id` int(11) NOT NULL,
  `payment_id` int(11) NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `amount_applied` decimal(12,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payments_dtl`
--

INSERT INTO `payments_dtl` (`payment_detail_id`, `payment_id`, `invoice_id`, `amount_applied`) VALUES
(5, 6, 19, 9.97),
(6, 7, 20, 195.00),
(7, 8, 21, 135.00),
(8, 9, 23, 505.00),
(9, 10, 24, 505.00),
(10, 11, 25, 100.00),
(11, 12, 29, 100.00),
(12, 13, 30, 500.00),
(13, 14, 35, 400.00);

-- --------------------------------------------------------

--
-- Table structure for table `payments_hdr`
--

CREATE TABLE `payments_hdr` (
  `payment_id` int(11) NOT NULL,
  `payment_number` varchar(50) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `payment_method_id` int(11) NOT NULL,
  `shift_id` int(11) DEFAULT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `amount_tendered` decimal(12,2) DEFAULT NULL,
  `change_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `reference_number` varchar(100) DEFAULT NULL,
  `remarks` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payments_hdr`
--

INSERT INTO `payments_hdr` (`payment_id`, `payment_number`, `customer_id`, `payment_method_id`, `shift_id`, `payment_date`, `amount`, `amount_tendered`, `change_amount`, `reference_number`, `remarks`) VALUES
(6, 'PAY-2026-0001', 5, 1, 9, '2026-10-04', 9.97, 500.00, 490.03, NULL, 'Paid at POS'),
(7, 'PAY-2026-0007', 7, 3, 9, '2026-10-04', 195.00, 195.00, 0.00, NULL, 'Paid at POS'),
(8, 'PAY-2026-0008', 2, 1, 10, '2026-10-04', 135.00, 500.00, 365.00, NULL, 'Paid at POS'),
(9, 'PAY-2026-0009', 5, 1, 11, '2026-10-04', 505.00, 1000.00, 495.00, NULL, 'Paid at POS'),
(10, 'PAY-2026-0010', 1, 1, NULL, '2026-10-04', 505.00, 505.00, 0.00, NULL, 'goods'),
(11, 'PAY-2026-0011', 2, 1, 12, '2026-10-04', 100.00, 100.00, 0.00, NULL, NULL),
(12, 'PAY-2026-0012', 7, 1, 13, '2026-10-04', 100.00, 100.00, 0.00, NULL, 'Paid at POS'),
(13, 'PAY-2026-0013', 2, 1, 13, '2026-10-04', 500.00, 500.00, 0.00, NULL, 'Paid at POS'),
(14, 'PAY-2026-0014', 7, 1, 10, '2026-10-04', 400.00, 400.00, 0.00, NULL, 'Paid at POS');

-- --------------------------------------------------------

--
-- Table structure for table `payment_methods`
--

CREATE TABLE `payment_methods` (
  `payment_method_id` int(11) NOT NULL,
  `method_name` varchar(50) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payment_methods`
--

INSERT INTO `payment_methods` (`payment_method_id`, `method_name`, `status`) VALUES
(1, 'Cash', 'ACTIVE'),
(2, 'Credit Card', 'ACTIVE'),
(3, 'GCash', 'ACTIVE'),
(4, 'Bank Transfer', 'ACTIVE'),
(5, 'PayMaya', 'ACTIVE'),
(6, 'BDO', 'ACTIVE'),
(7, 'LANDBANK', 'ACTIVE'),
(8, 'CASHMAYA', 'ACTIVE'),
(9, 'LANDBANK(SPECIAL EDITION)', 'ACTIVE');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `product_id` int(11) NOT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `product_name` varchar(150) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `unit_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `unit_id` int(11) DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`product_id`, `barcode`, `product_name`, `description`, `unit_price`, `unit_id`, `category_id`, `status`) VALUES
(1, '480001000001', 'Mineral Water 500ml', 'Bottled drinking water', 20.00, 4, 1, 'ACTIVE'),
(2, '480001000002', 'Soft Drink 1.5L', 'Carbonated soft drink', 75.00, 4, 1, 'ACTIVE'),
(3, '480001000003', 'Potato Chips', 'Potato chips 100g', 55.00, 1, 2, 'ACTIVE'),
(4, '480001000004', 'Coffee 3-in-1', 'Instant coffee pack', 9.97, 3, 1, 'ACTIVE'),
(5, '480001000005', 'Rice 5kg', 'Premium rice 5kg', 300.00, 2, 3, 'ACTIVE'),
(6, '500943248952', 'Milo', 'asfagasag', 10.00, 3, 1, 'ACTIVE'),
(7, '190324249234', 'hygienixes', '99.99 GERM KILL Alchol', 100.00, 4, 1, 'ACTIVE'),
(8, '777', 'Toy gun', 'gun', 60.00, 8, 5, 'ACTIVE'),
(9, '9023427423', 'Cup', 'Uses for drinking something liquid.', 50.00, 1, 4, 'ACTIVE');

-- --------------------------------------------------------

--
-- Table structure for table `product_category`
--

CREATE TABLE `product_category` (
  `category_id` int(11) NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_category`
--

INSERT INTO `product_category` (`category_id`, `category_name`, `description`, `status`) VALUES
(1, 'Beverages', 'Drinks and beveragess', 'ACTIVE'),
(2, 'Snacks', 'Snack products', 'ACTIVE'),
(3, 'Grocery', 'General grocery products', 'ACTIVE'),
(4, 'Shopping Products', 'It is a product you must follow', 'ACTIVE'),
(5, 'dry goods', 'goods', 'ACTIVE');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `role_id` int(11) NOT NULL,
  `role_name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`role_id`, `role_name`, `description`, `status`) VALUES
(1, 'ADMIN', 'System Administrator', 'ACTIVE'),
(2, 'CASHIER', 'POS Cashier', 'ACTIVE'),
(3, 'ACCOUNTING', 'Accounts Receivable Staff', 'ACTIVE'),
(4, 'clerk', 'dsadadaddsad', 'INACTIVE'),
(5, 'clerk(Authorizes)', 'dasgagasga', 'INACTIVE'),
(6, 'tagiya', 'owner', 'INACTIVE');

-- --------------------------------------------------------

--
-- Table structure for table `sales_dtl`
--

CREATE TABLE `sales_dtl` (
  `sales_detail_id` int(11) NOT NULL,
  `sales_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `line_total` decimal(12,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sales_dtl`
--

INSERT INTO `sales_dtl` (`sales_detail_id`, `sales_id`, `product_id`, `quantity`, `unit_price`, `line_total`) VALUES
(44, 20, 5, 1, 300.00, 300.00),
(45, 20, 2, 1, 75.00, 75.00),
(46, 20, 7, 1, 100.00, 100.00),
(47, 21, 2, 1, 75.00, 75.00),
(48, 21, 5, 1, 300.00, 300.00),
(49, 22, 2, 1, 75.00, 75.00),
(50, 22, 3, 1, 55.00, 55.00),
(51, 22, 5, 1, 300.00, 300.00),
(52, 22, 1, 1, 20.00, 20.00),
(53, 23, 2, 1, 75.00, 75.00),
(54, 24, 6, 1, 10.00, 10.00),
(55, 24, 2, 1, 75.00, 75.00),
(56, 24, 4, 1, 9.97, 9.97),
(57, 25, 2, 1, 75.00, 75.00),
(58, 25, 5, 1, 300.00, 300.00),
(59, 26, 4, 1, 9.97, 9.97),
(60, 27, 4, 1, 9.97, 9.97),
(61, 28, 3, 1, 55.00, 55.00),
(62, 28, 7, 1, 100.00, 100.00),
(63, 28, 1, 2, 20.00, 40.00),
(64, 29, 2, 1, 75.00, 75.00),
(65, 29, 8, 1, 60.00, 60.00),
(66, 30, 7, 1, 100.00, 100.00),
(67, 30, 1, 1, 20.00, 20.00),
(68, 30, 3, 1, 55.00, 55.00),
(69, 31, 2, 2, 75.00, 150.00),
(70, 31, 3, 1, 55.00, 55.00),
(71, 31, 5, 1, 300.00, 300.00),
(72, 32, 2, 2, 75.00, 150.00),
(73, 32, 5, 1, 300.00, 300.00),
(74, 32, 3, 1, 55.00, 55.00),
(75, 33, 2, 1, 75.00, 75.00),
(76, 33, 8, 1, 60.00, 60.00),
(77, 33, 3, 2, 55.00, 110.00),
(80, 35, 4, 1, 9.97, 9.97),
(81, 35, 7, 1, 100.00, 100.00),
(85, 37, 2, 2, 75.00, 150.00),
(86, 37, 3, 1, 55.00, 55.00),
(87, 38, 2, 2, 75.00, 150.00),
(88, 38, 4, 1, 9.97, 9.97),
(89, 38, 8, 1, 60.00, 60.00),
(90, 38, 5, 3, 300.00, 900.00),
(91, 38, 3, 1, 55.00, 55.00),
(92, 39, 4, 1, 9.97, 9.97),
(93, 39, 8, 1, 60.00, 60.00),
(94, 39, 2, 1, 75.00, 75.00),
(95, 39, 7, 1, 100.00, 100.00),
(96, 40, 4, 1, 9.97, 9.97),
(97, 40, 8, 1, 60.00, 60.00),
(98, 40, 2, 1, 75.00, 75.00),
(99, 40, 7, 1, 100.00, 100.00),
(100, 41, 4, 1, 9.97, 9.97),
(101, 41, 8, 1, 60.00, 60.00),
(102, 41, 7, 1, 100.00, 100.00),
(103, 41, 2, 3, 75.00, 225.00),
(104, 42, 2, 1, 75.00, 75.00),
(105, 42, 4, 1, 9.97, 9.97),
(106, 42, 7, 1, 100.00, 100.00),
(107, 43, 2, 3, 75.00, 225.00),
(108, 43, 7, 1, 100.00, 100.00),
(109, 43, 3, 2, 55.00, 110.00),
(110, 43, 9, 1, 50.00, 50.00),
(111, 43, 1, 1, 20.00, 20.00),
(112, 44, 2, 1, 75.00, 75.00),
(113, 44, 4, 1, 9.97, 9.97),
(114, 44, 7, 1, 100.00, 100.00);

-- --------------------------------------------------------

--
-- Table structure for table `sales_hdr`
--

CREATE TABLE `sales_hdr` (
  `sales_id` int(11) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `return_id` int(11) DEFAULT NULL,
  `terminal_id` int(11) DEFAULT NULL,
  `shift_id` int(11) DEFAULT NULL,
  `sales_date` date NOT NULL,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `created_by` int(11) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'COMPLETED'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sales_hdr`
--

INSERT INTO `sales_hdr` (`sales_id`, `customer_id`, `return_id`, `terminal_id`, `shift_id`, `sales_date`, `total_amount`, `created_by`, `status`) VALUES
(20, 7, NULL, 3, 5, '2026-10-03', 475.00, 2, 'COMPLETED'),
(21, NULL, NULL, 3, 6, '2026-10-03', 375.00, 2, 'HOLD'),
(22, 2, NULL, 3, 6, '2026-10-03', 450.00, 2, 'COMPLETED'),
(23, 1, NULL, 3, 6, '2026-10-03', 75.00, 2, 'COMPLETED'),
(24, 2, NULL, 3, 7, '2026-10-03', 94.97, 2, 'COMPLETED'),
(25, 6, 4, 3, 9, '2026-10-04', 375.00, 2, 'COMPLETED'),
(26, 6, NULL, 3, 9, '2026-10-04', 9.97, 2, 'COMPLETED'),
(27, 5, NULL, 3, 9, '2026-10-04', 9.97, 2, 'COMPLETED'),
(28, 7, NULL, 3, 9, '2026-10-04', 195.00, 2, 'COMPLETED'),
(29, 2, NULL, 4, 10, '2026-10-04', 135.00, 6, 'COMPLETED'),
(30, 7, NULL, 3, 11, '2026-10-04', 175.00, 2, 'COMPLETED'),
(31, 5, NULL, 3, 11, '2026-10-04', 505.00, 2, 'COMPLETED'),
(32, 1, NULL, 3, 11, '2026-10-04', 505.00, 2, 'COMPLETED'),
(33, 2, NULL, 3, 12, '2026-10-04', 245.00, 2, 'COMPLETED'),
(35, 7, NULL, 3, 13, '2026-10-04', 109.97, 2, 'COMPLETED'),
(37, 7, NULL, 3, 13, '2026-10-04', 205.00, 2, 'COMPLETED'),
(38, 2, NULL, 3, 13, '2026-10-04', 1174.97, 2, 'COMPLETED'),
(39, 1, NULL, 3, 13, '2026-10-04', 244.97, 2, 'COMPLETED'),
(40, 7, NULL, 3, 13, '2026-10-04', 244.97, 2, 'COMPLETED'),
(41, 5, NULL, 3, 13, '2026-10-04', 394.97, 2, 'COMPLETED'),
(42, 6, NULL, 3, 13, '2026-10-04', 184.97, 2, 'COMPLETED'),
(43, 7, NULL, 4, 10, '2026-10-04', 505.00, 6, 'COMPLETED'),
(44, 7, NULL, 4, 10, '2026-10-04', 184.97, 6, 'COMPLETED');

-- --------------------------------------------------------

--
-- Table structure for table `sales_return_dtl`
--

CREATE TABLE `sales_return_dtl` (
  `return_detail_id` int(11) NOT NULL,
  `return_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sales_return_dtl`
--

INSERT INTO `sales_return_dtl` (`return_detail_id`, `return_id`, `product_id`, `quantity`, `unit_price`, `subtotal`) VALUES
(4, 4, 5, 1, 300.00, 300.00),
(5, 5, 7, 1, 100.00, 100.00);

-- --------------------------------------------------------

--
-- Table structure for table `sales_return_hdr`
--

CREATE TABLE `sales_return_hdr` (
  `retrun_id` int(11) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `sales_id` int(11) DEFAULT NULL,
  `return_date` date NOT NULL,
  `return_reason` varchar(255) DEFAULT NULL,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sales_return_hdr`
--

INSERT INTO `sales_return_hdr` (`retrun_id`, `customer_id`, `sales_id`, `return_date`, `return_reason`, `total_amount`, `status`) VALUES
(4, 6, 25, '2026-10-04', 'dsdaaddad', 300.00, 'APPROVED'),
(5, 7, 30, '2026-10-04', 'Damage', 100.00, 'PENDING');

-- --------------------------------------------------------

--
-- Table structure for table `shifts`
--

CREATE TABLE `shifts` (
  `shift_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `terminal_id` int(11) NOT NULL,
  `schedule_id` int(11) DEFAULT NULL,
  `opened_at` datetime NOT NULL,
  `closed_at` datetime DEFAULT NULL,
  `float_start` decimal(12,2) NOT NULL DEFAULT 0.00,
  `closing_cash` decimal(12,2) DEFAULT NULL,
  `expected_cash` decimal(12,2) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'OPEN'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `shifts`
--

INSERT INTO `shifts` (`shift_id`, `user_id`, `terminal_id`, `schedule_id`, `opened_at`, `closed_at`, `float_start`, `closing_cash`, `expected_cash`, `status`) VALUES
(5, 2, 3, NULL, '2026-10-03 03:55:49', '2026-10-03 04:00:58', 0.00, NULL, NULL, 'CLOSED'),
(6, 2, 3, NULL, '2026-10-03 11:11:08', '2026-10-03 20:50:24', 0.00, NULL, NULL, 'CLOSED'),
(7, 2, 3, 4, '2026-10-03 21:07:56', '2026-10-03 21:10:04', 5000.00, NULL, NULL, 'CLOSED'),
(8, 2, 3, 4, '2026-10-03 21:14:55', '2026-10-03 21:18:41', 3000.00, NULL, NULL, 'CLOSED'),
(9, 2, 3, 4, '2026-10-03 21:20:58', '2026-10-04 11:52:48', 5000.00, 2800.00, 3009.97, 'CLOSED'),
(10, 6, 4, 4, '2026-10-04 02:43:07', NULL, 5000.00, NULL, NULL, 'OPEN'),
(11, 2, 3, 4, '2026-10-04 11:54:06', '2026-10-04 11:57:56', 2800.00, 1800.00, 2305.00, 'CLOSED'),
(12, 2, 3, 4, '2026-10-04 11:58:00', '2026-10-04 18:01:46', 1800.00, 1800.00, 1900.00, 'CLOSED'),
(13, 2, 3, 4, '2026-10-04 18:03:22', '2026-10-05 20:21:52', 1800.00, 1800.00, 2400.00, 'CLOSED'),
(14, 2, 3, 4, '2026-10-05 20:22:05', NULL, 1800.00, NULL, NULL, 'OPEN');

-- --------------------------------------------------------

--
-- Table structure for table `shift_cash_movement`
--

CREATE TABLE `shift_cash_movement` (
  `movement_id` int(11) NOT NULL,
  `shift_id` int(11) NOT NULL,
  `movement_type` varchar(20) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `shift_cash_movement`
--

INSERT INTO `shift_cash_movement` (`movement_id`, `shift_id`, `movement_type`, `amount`, `reason`, `status`, `approved_by`, `approved_at`, `created_at`) VALUES
(1, 8, 'FLOAT_ADJUST', -2000.00, 'to much', 'APPROVED', 2, NULL, '2026-10-03 21:17:44'),
(2, 9, 'FLOAT_ADJUST', 500.00, 'dsfsffdf', 'APPROVED', 3, '2026-10-04 11:11:17', '2026-10-04 11:04:52'),
(3, 9, 'CASH_DROP', 500.00, 'please', 'APPROVED', NULL, NULL, '2026-10-04 11:14:34'),
(4, 9, 'CASH_DROP', 2000.00, 'to much money', 'APPROVED', NULL, NULL, '2026-10-04 11:17:27'),
(5, 11, 'CASH_DROP', 1000.00, 'to much money in the drawer', 'APPROVED', NULL, NULL, '2026-10-04 11:57:02');

-- --------------------------------------------------------

--
-- Table structure for table `shift_schedule`
--

CREATE TABLE `shift_schedule` (
  `schedule_id` int(11) NOT NULL,
  `schedule_name` varchar(50) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `shift_schedule`
--

INSERT INTO `shift_schedule` (`schedule_id`, `schedule_name`, `start_time`, `end_time`, `status`) VALUES
(1, 'Morning', '09:00:00', '12:00:00', 'ACTIVE'),
(2, 'Afternoon', '12:00:00', '17:00:00', 'ACTIVE'),
(3, 'Evening', '17:00:00', '20:00:00', 'ACTIVE'),
(4, 'Full Time', '08:00:00', '20:00:00', 'ACTIVE');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_pos_terminal`
--

CREATE TABLE `tbl_pos_terminal` (
  `terminal_id` int(11) NOT NULL,
  `terminal_name` varchar(100) NOT NULL,
  `float_start` decimal(12,2) NOT NULL DEFAULT 5000.00,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_pos_terminal`
--

INSERT INTO `tbl_pos_terminal` (`terminal_id`, `terminal_name`, `float_start`, `status`) VALUES
(1, 'POS Terminal 01', 5000.00, 'ACTIVE'),
(2, 'POS Terminal 02', 5000.00, 'ACTIVE'),
(3, 'CASHIER COUNTER 1', 1800.00, 'ACTIVE'),
(4, 'CASHIER COUNTER 2', 5000.00, 'ACTIVE'),
(5, 'CASHIER COUNTER 3', 5000.00, 'ACTIVE'),
(6, 'CASHIER COUNTER 4', 5000.00, 'ACTIVE'),
(7, 'CASHIER COUNTER 5', 5000.00, 'ACTIVE'),
(8, 'ACOUNTANT COUNTER 1', 5000.00, 'ACTIVE');

-- --------------------------------------------------------

--
-- Table structure for table `terminal_assignment`
--

CREATE TABLE `terminal_assignment` (
  `ter_ass_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `terminal_id` int(11) NOT NULL,
  `schedule_id` int(11) NOT NULL DEFAULT 4
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `terminal_assignment`
--

INSERT INTO `terminal_assignment` (`ter_ass_id`, `user_id`, `terminal_id`, `schedule_id`) VALUES
(4, 6, 4, 4),
(7, 2, 3, 4);

--
-- Triggers `terminal_assignment`
--
DELIMITER $$
CREATE TRIGGER `trg_assignment_before_insert` BEFORE INSERT ON `terminal_assignment` FOR EACH ROW BEGIN
  IF EXISTS (
    SELECT 1
    FROM `terminal_assignment` a
    INNER JOIN `shift_schedule` s_old ON a.schedule_id = s_old.schedule_id
    INNER JOIN `shift_schedule` s_new ON s_new.schedule_id = NEW.schedule_id
    WHERE a.terminal_id = NEW.terminal_id
    AND s_old.start_time < s_new.end_time
    AND s_new.start_time < s_old.end_time
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This terminal already has a cashier in this time.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM `terminal_assignment` a
    INNER JOIN `shift_schedule` s_old ON a.schedule_id = s_old.schedule_id
    INNER JOIN `shift_schedule` s_new ON s_new.schedule_id = NEW.schedule_id
    WHERE a.user_id = NEW.user_id
    AND s_old.start_time < s_new.end_time
    AND s_new.start_time < s_old.end_time
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This cashier already has a terminal in this time.';
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_assignment_before_update` BEFORE UPDATE ON `terminal_assignment` FOR EACH ROW BEGIN
  IF EXISTS (
    SELECT 1
    FROM `terminal_assignment` a
    INNER JOIN `shift_schedule` s_old ON a.schedule_id = s_old.schedule_id
    INNER JOIN `shift_schedule` s_new ON s_new.schedule_id = NEW.schedule_id
    WHERE a.terminal_id = NEW.terminal_id
    AND a.ter_ass_id <> NEW.ter_ass_id
    AND s_old.start_time < s_new.end_time
    AND s_new.start_time < s_old.end_time
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This terminal already has a cashier in this time.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM `terminal_assignment` a
    INNER JOIN `shift_schedule` s_old ON a.schedule_id = s_old.schedule_id
    INNER JOIN `shift_schedule` s_new ON s_new.schedule_id = NEW.schedule_id
    WHERE a.user_id = NEW.user_id
    AND a.ter_ass_id <> NEW.ter_ass_id
    AND s_old.start_time < s_new.end_time
    AND s_new.start_time < s_old.end_time
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This cashier already has a terminal in this time.';
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `unit_tbl`
--

CREATE TABLE `unit_tbl` (
  `unit_id` int(11) NOT NULL,
  `unit_name` varchar(50) NOT NULL,
  `unit_code` varchar(50) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `unit_tbl`
--

INSERT INTO `unit_tbl` (`unit_id`, `unit_name`, `unit_code`, `status`) VALUES
(1, 'Piece', 'pcs', 'ACTIVE'),
(2, 'Box', 'BX', 'ACTIVE'),
(3, 'Pack', 'PK', 'ACTIVE'),
(4, 'Bottle', 'BO', 'INACTIVE'),
(5, 'Kilogram', 'Kg', 'ACTIVE'),
(6, 'Pound', 'lb', 'ACTIVE'),
(7, 'Gallon', 'fl oz', 'ACTIVE'),
(8, 'Sack', 'SK', 'ACTIVE'),
(9, 'volume', 'ml', 'ACTIVE');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `role_id` int(11) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `username`, `password_hash`, `full_name`, `email`, `role_id`, `status`) VALUES
(1, 'admin', '$2y$12$p18eJ8BVEaQPpwy7nOLOWucb7V13vY5ER06/MccViX1oWgMz/e3rq', 'System Administrator', 'admin@pos.com', 1, 'ACTIVE'),
(2, 'cashier01', '$2y$10$0zLkrKDvQYIa/15D3Avotesi/qqO1l6dJZFBQEmVotVo.lfD64PNK', 'Juan Dela Cruz', 'cashier@pos.com', 2, 'ACTIVE'),
(3, 'accounting01', '$2y$10$0zLkrKDvQYIa/15D3Avotesi/qqO1l6dJZFBQEmVotVo.lfD64PNK', 'Maria Santos', 'accounting@pos.com', 3, 'ACTIVE'),
(4, 'crecks01', '$2y$10$HRKq0BXtPDMKFRvYdjwwYuBAoIJOyAKhYppG5L9enduWV34sLi0nm', 'crecks daidigan', 'nickcharlesclarito@gmail.com', 2, 'INACTIVE'),
(5, 'clerk03', '$2y$10$OIhCYPbV4hsULaSSLsmomuAO5/ZhLDcaDif1QSYGWyP2NJTydgVsm', 'crecks daidigan', 'clarito.nickcharles@gmail.com', 5, 'INACTIVE'),
(6, 'cashier02', '$2y$10$0zLkrKDvQYIa/15D3Avotesi/qqO1l6dJZFBQEmVotVo.lfD64PNK', 'Nick Charles Clarito', 'nickcharlesclarito@gmail.com', 2, 'ACTIVE');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`customer_id`),
  ADD KEY `fk_customers_group_days` (`group_days_id`);

--
-- Indexes for table `group_days`
--
ALTER TABLE `group_days`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `invoice`
--
ALTER TABLE `invoice`
  ADD PRIMARY KEY (`invoice_id`),
  ADD UNIQUE KEY `invoice_number` (`invoice_number`),
  ADD KEY `fk_invoice_sales` (`sales_id`);

--
-- Indexes for table `payments_dtl`
--
ALTER TABLE `payments_dtl`
  ADD PRIMARY KEY (`payment_detail_id`),
  ADD KEY `fk_payments_dtl_payment` (`payment_id`),
  ADD KEY `fk_payments_dtl_invoice` (`invoice_id`);

--
-- Indexes for table `payments_hdr`
--
ALTER TABLE `payments_hdr`
  ADD PRIMARY KEY (`payment_id`),
  ADD UNIQUE KEY `payment_number` (`payment_number`),
  ADD KEY `fk_payments_customer` (`customer_id`),
  ADD KEY `fk_payments_method` (`payment_method_id`),
  ADD KEY `fk_payments_shift` (`shift_id`);

--
-- Indexes for table `payment_methods`
--
ALTER TABLE `payment_methods`
  ADD PRIMARY KEY (`payment_method_id`),
  ADD UNIQUE KEY `method_name` (`method_name`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_id`),
  ADD UNIQUE KEY `uq_products_barcode` (`barcode`),
  ADD KEY `fk_products_unit` (`unit_id`),
  ADD KEY `fk_products_category` (`category_id`);

--
-- Indexes for table `product_category`
--
ALTER TABLE `product_category`
  ADD PRIMARY KEY (`category_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`role_id`),
  ADD UNIQUE KEY `role_name` (`role_name`);

--
-- Indexes for table `sales_dtl`
--
ALTER TABLE `sales_dtl`
  ADD PRIMARY KEY (`sales_detail_id`),
  ADD KEY `fk_sales_dtl_sales` (`sales_id`),
  ADD KEY `fk_sales_dtl_product` (`product_id`);

--
-- Indexes for table `sales_hdr`
--
ALTER TABLE `sales_hdr`
  ADD PRIMARY KEY (`sales_id`),
  ADD KEY `fk_sales_customer` (`customer_id`),
  ADD KEY `fk_sales_terminal` (`terminal_id`),
  ADD KEY `fk_sales_user` (`created_by`),
  ADD KEY `fk_sales_return` (`return_id`),
  ADD KEY `fk_sales_shift` (`shift_id`);

--
-- Indexes for table `sales_return_dtl`
--
ALTER TABLE `sales_return_dtl`
  ADD PRIMARY KEY (`return_detail_id`),
  ADD KEY `fk_return_dtl_return` (`return_id`),
  ADD KEY `fk_return_dtl_product` (`product_id`);

--
-- Indexes for table `sales_return_hdr`
--
ALTER TABLE `sales_return_hdr`
  ADD PRIMARY KEY (`retrun_id`),
  ADD KEY `fk_return_customer` (`customer_id`),
  ADD KEY `fk_return_sales` (`sales_id`);

--
-- Indexes for table `shifts`
--
ALTER TABLE `shifts`
  ADD PRIMARY KEY (`shift_id`),
  ADD KEY `fk_shifts_user` (`user_id`),
  ADD KEY `fk_shifts_terminal` (`terminal_id`),
  ADD KEY `fk_shifts_schedule` (`schedule_id`);

--
-- Indexes for table `shift_cash_movement`
--
ALTER TABLE `shift_cash_movement`
  ADD PRIMARY KEY (`movement_id`),
  ADD KEY `fk_movement_shift` (`shift_id`),
  ADD KEY `fk_movement_approved_by` (`approved_by`);

--
-- Indexes for table `shift_schedule`
--
ALTER TABLE `shift_schedule`
  ADD PRIMARY KEY (`schedule_id`),
  ADD UNIQUE KEY `schedule_name` (`schedule_name`);

--
-- Indexes for table `tbl_pos_terminal`
--
ALTER TABLE `tbl_pos_terminal`
  ADD PRIMARY KEY (`terminal_id`);

--
-- Indexes for table `terminal_assignment`
--
ALTER TABLE `terminal_assignment`
  ADD PRIMARY KEY (`ter_ass_id`),
  ADD UNIQUE KEY `uq_assignment_terminal_schedule` (`terminal_id`,`schedule_id`),
  ADD UNIQUE KEY `uq_assignment_user_schedule` (`user_id`,`schedule_id`),
  ADD KEY `fk_assignment_terminal` (`terminal_id`),
  ADD KEY `fk_assignment_schedule` (`schedule_id`);

--
-- Indexes for table `unit_tbl`
--
ALTER TABLE `unit_tbl`
  ADD PRIMARY KEY (`unit_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `fk_users_role` (`role_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `customer_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `group_days`
--
ALTER TABLE `group_days`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `invoice`
--
ALTER TABLE `invoice`
  MODIFY `invoice_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT for table `payments_dtl`
--
ALTER TABLE `payments_dtl`
  MODIFY `payment_detail_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `payments_hdr`
--
ALTER TABLE `payments_hdr`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `payment_methods`
--
ALTER TABLE `payment_methods`
  MODIFY `payment_method_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `product_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `product_category`
--
ALTER TABLE `product_category`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `sales_dtl`
--
ALTER TABLE `sales_dtl`
  MODIFY `sales_detail_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=115;

--
-- AUTO_INCREMENT for table `sales_hdr`
--
ALTER TABLE `sales_hdr`
  MODIFY `sales_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT for table `sales_return_dtl`
--
ALTER TABLE `sales_return_dtl`
  MODIFY `return_detail_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `sales_return_hdr`
--
ALTER TABLE `sales_return_hdr`
  MODIFY `retrun_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `shifts`
--
ALTER TABLE `shifts`
  MODIFY `shift_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `shift_cash_movement`
--
ALTER TABLE `shift_cash_movement`
  MODIFY `movement_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `shift_schedule`
--
ALTER TABLE `shift_schedule`
  MODIFY `schedule_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tbl_pos_terminal`
--
ALTER TABLE `tbl_pos_terminal`
  MODIFY `terminal_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `terminal_assignment`
--
ALTER TABLE `terminal_assignment`
  MODIFY `ter_ass_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `unit_tbl`
--
ALTER TABLE `unit_tbl`
  MODIFY `unit_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `customers`
--
ALTER TABLE `customers`
  ADD CONSTRAINT `fk_customers_group_days` FOREIGN KEY (`group_days_id`) REFERENCES `group_days` (`id`);

--
-- Constraints for table `invoice`
--
ALTER TABLE `invoice`
  ADD CONSTRAINT `fk_invoice_sales` FOREIGN KEY (`sales_id`) REFERENCES `sales_hdr` (`sales_id`);

--
-- Constraints for table `payments_dtl`
--
ALTER TABLE `payments_dtl`
  ADD CONSTRAINT `fk_payments_dtl_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoice` (`invoice_id`),
  ADD CONSTRAINT `fk_payments_dtl_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments_hdr` (`payment_id`);

--
-- Constraints for table `payments_hdr`
--
ALTER TABLE `payments_hdr`
  ADD CONSTRAINT `fk_payments_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  ADD CONSTRAINT `fk_payments_method` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`payment_method_id`),
  ADD CONSTRAINT `fk_payments_shift` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`shift_id`);

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `product_category` (`category_id`),
  ADD CONSTRAINT `fk_products_unit` FOREIGN KEY (`unit_id`) REFERENCES `unit_tbl` (`unit_id`);

--
-- Constraints for table `sales_dtl`
--
ALTER TABLE `sales_dtl`
  ADD CONSTRAINT `fk_sales_dtl_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`),
  ADD CONSTRAINT `fk_sales_dtl_sales` FOREIGN KEY (`sales_id`) REFERENCES `sales_hdr` (`sales_id`);

--
-- Constraints for table `sales_hdr`
--
ALTER TABLE `sales_hdr`
  ADD CONSTRAINT `fk_sales_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  ADD CONSTRAINT `fk_sales_return` FOREIGN KEY (`return_id`) REFERENCES `sales_return_hdr` (`retrun_id`),
  ADD CONSTRAINT `fk_sales_shift` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`shift_id`),
  ADD CONSTRAINT `fk_sales_terminal` FOREIGN KEY (`terminal_id`) REFERENCES `tbl_pos_terminal` (`terminal_id`),
  ADD CONSTRAINT `fk_sales_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `sales_return_dtl`
--
ALTER TABLE `sales_return_dtl`
  ADD CONSTRAINT `fk_return_dtl_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`),
  ADD CONSTRAINT `fk_return_dtl_return` FOREIGN KEY (`return_id`) REFERENCES `sales_return_hdr` (`retrun_id`);

--
-- Constraints for table `sales_return_hdr`
--
ALTER TABLE `sales_return_hdr`
  ADD CONSTRAINT `fk_return_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  ADD CONSTRAINT `fk_return_sales` FOREIGN KEY (`sales_id`) REFERENCES `sales_hdr` (`sales_id`);

--
-- Constraints for table `shifts`
--
ALTER TABLE `shifts`
  ADD CONSTRAINT `fk_shifts_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `shift_schedule` (`schedule_id`),
  ADD CONSTRAINT `fk_shifts_terminal` FOREIGN KEY (`terminal_id`) REFERENCES `tbl_pos_terminal` (`terminal_id`),
  ADD CONSTRAINT `fk_shifts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `shift_cash_movement`
--
ALTER TABLE `shift_cash_movement`
  ADD CONSTRAINT `fk_movement_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_movement_shift` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`shift_id`);

--
-- Constraints for table `terminal_assignment`
--
ALTER TABLE `terminal_assignment`
  ADD CONSTRAINT `fk_assignment_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `shift_schedule` (`schedule_id`),
  ADD CONSTRAINT `fk_assignment_terminal` FOREIGN KEY (`terminal_id`) REFERENCES `tbl_pos_terminal` (`terminal_id`),
  ADD CONSTRAINT `fk_assignment_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
