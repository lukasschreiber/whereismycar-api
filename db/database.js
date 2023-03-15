import Database from "better-sqlite3";

const db = new Database("./db/sqlite/wimc.sqlite");

// create user table
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid VARCHAR(255),
        username VARCHAR(255), 
        email VARCHAR(255), 
        password VARCHAR(255),             
        resetPasswordToken VARCHAR(255), 
        resetPasswordExpires DATETIME,   
        emailToken INTEGER, 
        emailTokenExpires DATETIME,
        accessToken VARCHAR(255),
        active BOOLEAN,          
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TRIGGER IF NOT EXISTS tg_users_updated_at
    AFTER UPDATE
    ON users FOR EACH ROW
    BEGIN
    UPDATE users SET updatedAt = CURRENT_TIMESTAMP
        WHERE id = old.id;
    END;
`);

// create car
db.exec(`
    CREATE TABLE IF NOT EXISTS cars (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license VARCHAR(255),
        name VARCHAR(255), 
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TRIGGER IF NOT EXISTS tg_cars_updated_at
    AFTER UPDATE
    ON cars FOR EACH ROW
    BEGIN
    UPDATE cars SET updatedAt = CURRENT_TIMESTAMP
        WHERE id = old.id;
    END;
    CREATE TABLE IF NOT EXISTS userCars (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        carId INTEGER,
        active BOOLEAN,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TRIGGER IF NOT EXISTS tg_userCars_updated_at
    AFTER UPDATE
    ON userCars FOR EACH ROW
    BEGIN
    UPDATE userCars SET updatedAt = CURRENT_TIMESTAMP
        WHERE id = old.id;
    END;
`);

db.exec(`
CREATE TABLE IF NOT EXISTS invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userCarsId INTEGER,
    token INTEGER,
    tokenExpires DATETIME,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)
`)

db.exec(`
    CREATE TABLE IF NOT EXISTS keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid VARCHAR(255),
        name VARCHAR(255),
        carId INTEGER, 
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TRIGGER IF NOT EXISTS tg_keys_updated_at
    AFTER UPDATE
    ON keys FOR EACH ROW
    BEGIN
    UPDATE keys SET updatedAt = CURRENT_TIMESTAMP
        WHERE id = old.id;
    END;
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        x REAL,
        y REAL,
        number INTEGER,
        carId INTEGER, 
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TRIGGER IF NOT EXISTS tg_positions_updated_at
    AFTER UPDATE
    ON positions FOR EACH ROW
    BEGIN
    UPDATE positions SET updatedAt = CURRENT_TIMESTAMP
        WHERE id = old.id;
    END;
`);

export { db };
