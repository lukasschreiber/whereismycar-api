import express from "express";
import validateToken from '../middleware/authenticate.js';
import * as User from '../users/user.js';

const router = express.Router();
router.post("/signup", User.Signup);
router.post("/login", User.Login);
router.patch("/activate", User.Activate);
router.patch("/forgot", User.ForgotPassword);
router.patch("/reset", User.ResetPassword);
router.get("/user", validateToken, User.GetUser);

export default router;