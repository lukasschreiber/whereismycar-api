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

export const DeleteCar = async (req, res) => {
    try {
        db.prepare("DELETE FROM cars WHERE license = ?").run(req.params.license);
        return res.status(204).send();
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: error.message,
        });
    }
};

export const GetCars = async (req, res) => {
    const cars = db.prepare("SELECT * FROM cars INNER JOIN userCars ON userCars.carId = cars.id").all();
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
    try {
        const car = db.prepare("SELECT * FROM cars WHERE license = ?").get(req.params.license);
        if (!car) throw ({message: "Car not found"});
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
    if (!req.body.name) {
        console.log(result.error.message);
        return res.status(400).json({
            message: "field name must be provided",
        });
    }

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

    db.prepare('INSERT INTO userCars (userId, carId) VALUES(?,?)').run(user.id, newCar.lastInsertRowid);

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

export const StorePosition = (req, res) => {
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