-- 1. create new db
CREATE DATABASE clothing_donation_db;

-- 2. use the db created
USE clothing_donation_db;

-- 3. initialise
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clothing_items (
    cloth_id INT AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    description TEXT,
    size VARCHAR(10),
    condition VARCHAR(20),
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);

CREATE TABLE categories (
    category_id INT PRIMARY KEY,
    category_name FOREIGN KEY (category_name) REFERENCES clothing_items(category);
    item_name FOREIGN KEY (item_name) REFERENCES clothing_items(item_name);
    description FOREIGN KEY (description) REFERENCES clothing_items(description);
    size FOREIGN KEY (size) REFERENCES clothing_items(size);
    condition FOREIGN KEY (condition) REFERENCES clothing_items(condition);
    created_at FOREIGN KEY (created_at) REFERENCES clothing_items(created_at);
);

