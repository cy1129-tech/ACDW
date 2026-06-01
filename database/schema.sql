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
    gender ENUM('Female','Male','Unisex') NOT NULL,
    age_group      ENUM('Girl','Adult','Elderly') NOT NULL,
    clothing_type  ENUM('Pants','Clothes','Skirt','Dress') NOT NULL,
    sub_type       ENUM('Long pants','Short pants',
                        'Long sleeve','Short sleeve',
                        'Long skirt','Short skirt') NULL,
    combined_label VARCHAR(255),
    priority       ENUM('High','Medium','Low') DEFAULT 'Medium',
    pool           VARCHAR(50),
    image_path     VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);




