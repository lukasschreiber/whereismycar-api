import express from "express";
import validateToken from '../middleware/authenticate.js';
import * as Car from '../cars/car.js';

const router = express.Router();
router.post("/", validateToken, Car.CreateCar);
router.post("/:license/park", validateToken, Car.StorePosition);
router.get("/", validateToken, Car.GetCars);
router.patch("/:license", validateToken, Car.UpdateCar);
router.get("/:license", validateToken, Car.GetCar);
router.delete("/:license", validateToken, Car.DeleteCar);

export default router;