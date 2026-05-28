-- 1. create new db
CREATE DATABASE clothing_donation_db;

-- 2. use the db created
USE clothing_donation_db;

-- 3. initialise
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
