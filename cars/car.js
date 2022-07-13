import joi from 'joi';
import { db } from '../db/database.js';

const carSchema = joi.object({
    license: joi.string().required(),
    name: joi.string().required()
});

const positionSchema = joi.object({
    x: joi.number().required(),
    y: joi.number().required(),
    number: joi.number()
});

export const DeleteCar = async (req, res) => {
    try {
        db.prepare("DELETE FROM cars WHERE license = ?").run(req.params.license);
        return res.send({
            success: true,
            message: "Deletion Success"
        });
    } catch (error) {
        console.error("car-not-found-error", error);
        return res.status(500).json({
            error: true,
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
        const keys = db.prepare("SELECT uuid, name, createdAt, updatedAt FROM keys WHERE carId = ?").all(car.id);
        const positions = db.prepare("SELECT x, y, number, createdAt FROM positions WHERE carId = ?").all(car.id);
        if (!car) throw ("car-not-found-error");
        const { name, license, createdAt, updatedAt } = car;
        return res.send({
            success: true,
            name,
            createdAt,
            updatedAt,
            license,
            keys: keys,
            positions: positions
        });
    } catch (error) {
        console.error("car-not-found-error", error);
        return res.status(500).json({
            error: true,
            message: error.message,
        });
    }
};

export const UpdateCar = async (req, res) => {
    if (!req.body.name) {
        console.log(result.error.message);
        return res.json({
            error: true,
            status: 400,
            message: "field name must be set",
        });
    }

    db.prepare("UPDATE cars SET name = ? WHERE license = ?").run(req.body.name, req.params.license);

    return res.status(200).json({
        success: true,
        message: "Update Success",
    });
};

export const CreateCar = async (req, res) => {
    // console.log(req.params.license);
    const result = carSchema.validate(req.body);
    if (result.error) {
        console.log(result.error.message);
        return res.json({
            error: true,
            status: 400,
            message: result.error.message,
        });
    }

    // //Check if the car has been already registered.
    let car = db.prepare('SELECT * FROM cars WHERE license = ?').get(result.value.license);
    if (car) {
        return res.json({
            error: true,
            message: "Car has already been registered",
        });
    }

    const newCar = db.prepare('INSERT INTO cars (license, name) VALUES(?,?)').run(result.value.license, result.value.name);
    const user = db.prepare('SELECT id FROM users WHERE uuid = ?').get(req.decodedToken.id);

    db.prepare('INSERT INTO userCars (userId, carId) VALUES(?,?)').run(user.id, newCar.lastInsertRowid);

    return res.status(200).json({
        success: true,
        message: "Creation Success"
    });
};

export const StorePosition = (req, res) => {
    const result = positionSchema.validate(req.body);
    if (result.error) {
        console.log(result.error.message);
        return res.json({
            error: true,
            status: 400,
            message: result.error.message,
        });
    }

    let car = db.prepare('SELECT * FROM cars WHERE license = ?').get(req.params.license);
    if (!car) {
        return res.json({
            error: true,
            message: "Car has not been found",
        });
    }

    db.prepare('INSERT INTO positions (x, y, number, carId) VALUES(?,?,?,?)').run(result.value.x, result.value.y, result.value.number, car.id);

    return res.status(200).json({
        success: true,
        message: "Creation Success"
    });
};