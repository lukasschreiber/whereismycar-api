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
        emailToken VARCHAR(255), 
        emailTokenExpires DATETIME,
        accessToken VARCHAR(255),          
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


export { db };