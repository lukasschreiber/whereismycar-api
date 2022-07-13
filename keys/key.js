import joi from 'joi';
import { db } from '../db/database.js';
import {v4 as uuid} from 'uuid';

const keySchema = joi.object({
    license: joi.string().required(),
    name: joi.string().required()
});

export const DeleteKey = async (req, res) => {
    try {
        db.prepare("DELETE FROM keys WHERE uuid = ?").run(req.params.uuid);
        return res.send({
            success: true,
            message: "Deletion Success"
        });
    } catch (error) {
        console.error("key-not-found-error", error);
        return res.status(500).json({
            error: true,
            message: error.message,
        });
    }
};


export const GetKey = async (req, res) => {
    try {
        const car = db.prepare("SELECT * FROM keys WHERE uuid = ?").get(req.params.uuid);
        if (!car) throw ("key-not-found-error");
        const { name, license } = car;
        return res.send({
            success: true,
            name,
            license
        });
    } catch (error) {
        console.error("key-not-found-error", error);
        return res.status(500).json({
            error: true,
            message: error.message,
        });
    }
};

export const UpdateKey = async (req, res) => {
    if (!req.body.name) {
        console.log(result.error.message);
        return res.json({
            error: true,
            status: 400,
            message: "field name must be set",
        });
    }

    db.prepare("UPDATE keys SET name = ? WHERE uuid = ?").run(req.body.name, req.params.uuid);

    return res.status(200).json({
        success: true,
        message: "Update Success",
    });
};

export const CreateKey = async (req, res) => {
    // console.log(req.params.license);
    const result = keySchema.validate(req.body);
    if (result.error) {
        console.log(result.error.message);
        return res.json({
            error: true,
            status: 400,
            message: result.error.message,
        });
    }

    const car = db.prepare('SELECT id FROM cars WHERE license = ?').get(result.value.license);
    const id = uuid();
    db.prepare('INSERT INTO keys (carId, name, uuid) VALUES(?,?,?)').run(car.id, result.value.name, id);

    return res.status(200).json({
        success: true,
        message: "Creation Success",
        uuid: id
    });
};