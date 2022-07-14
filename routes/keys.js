import express from "express";
import validateToken from '../middleware/authenticate.js';
import * as Key from '../controllers/key.js';

const router = express.Router();
router.post("/", validateToken, Key.CreateKey);
router.patch("/:uuid", validateToken, Key.UpdateKey);
router.get("/:uuid", validateToken, Key.GetKey);
router.delete("/:uuid", validateToken, Key.DeleteKey);

export default router;