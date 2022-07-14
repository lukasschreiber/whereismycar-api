import joi from 'joi';
import { db } from '../db/database.js';

const carSchema = joi.object({
    license: joi.string().required(),
    name: joi.string().required()
});

const positionSchema = joi.object({
    x: joi.number().required(),
    y: joi.number().required(),
    number: joi.number().allow(null)
});

const invitationSchema = joi.object({
    email: joi.string().required()
});

const userHasRights = (uuid, license) => {
    const userId = db.prepare("SELECT id FROM users WHERE uuid = ?").get(uuid);
    return db.prepare("SELECT * FROM cars INNER JOIN userCars ON userCars.carId = cars.id WHERE license = ? AND userId = ?").all(license, userId.id).length > 0;
};

export const DeleteCar = async (req, res) => {
    // check if car is mine
    if (!userHasRights(req.decodedToken.id, req.params.license)) {
        return res.status(403).send();
    }

    try {
        const carId = db.prepare("SELECT id FROM cars WHERE license = ?").get(req.params.license);
        db.prepare("DELETE FROM cars WHERE license = ?").run(req.params.license);
        db.prepare("DELETE FROM userCars WHERE carId = ?").run(carId.id);
        return res.status(204).send();
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: error.message,
        });
    }
};

export const GetCars = async (req, res) => {
    const userId = db.prepare("SELECT id FROM users WHERE uuid = ?").get(req.decodedToken.id);
    const cars = db.prepare("SELECT * FROM cars INNER JOIN userCars ON userCars.carId = cars.id WHERE userId = ? AND active = TRUE").all(userId.id);
    return res.send(cars.map(car => ({
        license: car.license,
        name: car.name,
        createdAt: car.createdAt,
        updatedAt: car.updatedAt,
        keys: db.prepare("SELECT uuid, name, createdAt, updatedAt FROM keys WHERE carId = ?").all(car.id),
        positions: db.prepare("SELECT x, y, number, createdAt FROM positions WHERE carId = ?").all(car.id)
    })));
};

export const GetCar = async (req, res) => {
    if (!userHasRights(req.decodedToken.id, req.params.license)) {
        return res.status(403).send();
    }

    try {
        const car = db.prepare("SELECT * FROM cars INNER JOIN userCars ON userCars.carId = cars.id WHERE license = ? AND active = TRUE").get(req.params.license);
        if (!car) throw ({ message: "Car not found" });
        const { name, license, createdAt, updatedAt } = car;
        return res.send({
            name,
            createdAt,
            updatedAt,
            license,
            keys: db.prepare("SELECT uuid, name, createdAt, updatedAt FROM keys WHERE carId = ?").all(car.id),
            positions: db.prepare("SELECT x, y, number, createdAt FROM positions WHERE carId = ?").all(car.id)
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: error.message,
        });
    }
};

export const UpdateCar = async (req, res) => {
    if (!userHasRights(req.decodedToken.id, req.params.license)) {
        return res.status(403).send();
    }

    if (!req.body.name) {
        console.log(result.error.message);
        return res.status(400).json({
            message: "field name must be provided",
        });
    }

    // check if car is mine

    db.prepare("UPDATE cars SET name = ? WHERE license = ?").run(req.body.name, req.params.license);

    const car = db.prepare("SELECT * FROM cars WHERE license = ?").get(req.params.license);
    const { name, license, createdAt, updatedAt } = car;
    return res.send({
        name,
        createdAt,
        updatedAt,
        license,
        keys: db.prepare("SELECT uuid, name, createdAt, updatedAt FROM keys WHERE carId = ?").all(car.id),
        positions: db.prepare("SELECT x, y, number, createdAt FROM positions WHERE carId = ?").all(car.id)
    });

};

export const CreateCar = async (req, res) => {
    const result = carSchema.validate(req.body);
    if (result.error) {
        console.log(result.error.message);
        return res.status(400).json({
            message: result.error.message,
        });
    }

    // Check if the car has been already registered.
    let existingCar = db.prepare('SELECT * FROM cars WHERE license = ?').get(result.value.license);
    if (existingCar) {
        return res.status(400).json({
            message: "Car has already been registered",
        });
    }

    const newCar = db.prepare('INSERT INTO cars (license, name) VALUES(?,?)').run(result.value.license, result.value.name);
    const user = db.prepare('SELECT id FROM users WHERE uuid = ?').get(req.decodedToken.id);

    db.prepare('INSERT INTO userCars (userId, carId, active) VALUES(?,?,?)').run(user.id, newCar.lastInsertRowid, true);

    const car = db.prepare("SELECT * FROM cars WHERE license = ?").get(result.value.license);
    const { name, license, createdAt, updatedAt } = car;
    return res.send({
        name,
        createdAt,
        updatedAt,
        license,
        keys: db.prepare("SELECT uuid, name, createdAt, updatedAt FROM keys WHERE carId = ?").all(car.id),
        positions: db.prepare("SELECT x, y, number, createdAt FROM positions WHERE carId = ?").all(car.id)
    });
};

export const InviteUserToCar = (req, res) => {
    // check if key is mine
    if (!userHasRights(req.decodedToken.id, req.params.license)) {
        return res.status(403).send();
    }

    const result = invitationSchema.validate(req.body);
    if (result.error) {
        console.log(result.error.message);
        return res.status(400).json({
            message: result.error.message,
        });
    }

    const car = db.prepare("SELECT id from cars WHERE license = ?").get(req.params.license);
    const user = db.prepare("SELECT id from users WHERE email = ?").get(result.value.email);
    db.prepare('INSERT INTO userCars (userId, carId, active) VALUES(?,?,false)').run(user.id, car.id); // create invitation code that expires after a short time

    if (!user) {
        return res.status(400).json({
            message: "There is no user with this email address.",
        });
    }

    return res.status(200).json({
        message: "Invited User"
    });
};

// activate invitation

export const StorePosition = (req, res) => {
    // check if key is mine
    if (!userHasRights(req.decodedToken.id, req.params.license)) {
        return res.status(403).send();
    }

    const result = positionSchema.validate(req.body);
    if (result.error) {
        console.log(result.error.message);
        return res.status(400).json({
            message: result.error.message,
        });
    }

    let car = db.prepare('SELECT * FROM cars WHERE license = ?').get(req.params.license);
    if (!car) {
        return res.status(400).json({
            message: "Car has not been found",
        });
    }

    db.prepare('INSERT INTO positions (x, y, number, carId) VALUES(?,?,?,?)').run(result.value.x, result.value.y, result.value.number, car.id);

    return res.status(204).send();
};