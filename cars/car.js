import joi from 'joi';
import { db } from '../db/database.js';

const carSchema = joi.object({
    license: joi.string().required(),
    name: joi.string().required()
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


export const GetCar = async (req, res) => {
    try {
        const car = db.prepare("SELECT * FROM cars WHERE license = ?").get(req.params.license);
        const keys = db.prepare("SELECT * FROM keys WHERE carId = ?").all(car.id);
        if (!car) throw ("car-not-found-error");
        const { name, license, createdAt, updatedAt } = car;
        return res.send({
            success: true,
            name,
            createdAt,
            updatedAt,
            license,
            keys: keys.map(key => ({uuid: key.uuid, name: key.name, createdAt: key.createdAt, updatedAt: key.updatedAt}))
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