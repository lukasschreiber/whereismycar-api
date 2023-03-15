import express from "express";
import validateToken from '../middleware/authenticate.js';
import * as Car from '../controllers/car.js';

const router = express.Router();
router.post("/", validateToken, Car.CreateCar);
router.post("/:license/park", validateToken, Car.StorePosition);
router.post("/:license/invite", validateToken, Car.InviteUserToCar);
router.post("/:license/accept", validateToken, Car.AcceptInvitation);
router.get("/", validateToken, Car.GetCars);
router.patch("/:license", validateToken, Car.UpdateCar);
router.get("/:license", validateToken, Car.GetCar);
router.delete("/:license", validateToken, Car.DeleteCar);

export default router;