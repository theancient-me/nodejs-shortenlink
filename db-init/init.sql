CREATE DATABASE IF NOT EXISTS nodejs_shorten_url;

USE nodejs_shorten_url;

CREATE TABLE IF NOT EXISTS urls (
    id INT PRIMARY KEY AUTO_INCREMENT,
    short_url VARCHAR(200) NOT NULL,
    full_url VARCHAR(200) NOT NULL,
    visits INT DEFAULT 0,
    INDEX (short_url)
);
