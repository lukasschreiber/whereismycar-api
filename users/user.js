import bcrypt from 'bcrypt';
import joi from 'joi';
import { v4 as uuid } from 'uuid';
import { db } from '../db/database.js';
import { generateToken } from './helpers/generateToken.js';
import { sendEmail } from './helpers/mailer.js';

const hashPassword = async (password) => {
    try {
        const salt = await bcrypt.genSalt(10); // 10 rounds
        return await bcrypt.hash(password, salt);
    } catch (error) {
        throw new Error("Hashing failed", error);
    }
};

const userSchema = joi.object({
    email: joi.string().email({ minDomainSegments: 2 }),
    password: joi.string().required().min(4),
    username: joi.string().required(),
    confirmPassword: joi.string().valid(joi.ref("password")).required(),
});

const comparePasswords = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

export const Signup = async (req, res) => {
    try {
        const result = userSchema.validate(req.body);
        if (result.error) {
            console.log(result.error.message);
            return res.json({
                error: true,
                status: 400,
                message: result.error.message,
            });
        }

        //Check if the email has been already registered.
        let user = db.prepare('SELECT * FROM users WHERE email = ?').get(result.value.email);
        if (user) {
            return res.json({
                error: true,
                message: "Email is already in use",
            });
        }
        const hash = await hashPassword(result.value.password);
        const id = uuid(); //Generate unique id for the user.
        result.value.uuid = id;

        delete result.value.confirmPassword;
        result.value.password = hash;

        let code = Math.floor(100000 + Math.random() * 900000);  //Generate random 6 digit code.                             
        let expiry = Date.now() + 60 * 1000 * 15;  //Set expiry 15 mins ahead from now
        const sendCode = await sendEmail(result.value.email, code);
        if (sendCode.error) {
            return res.status(500).json({
                error: true,
                message: "Couldn't send verification email.",
            });
        }

        result.value.emailToken = code;
        result.value.emailTokenExpires = new Date(expiry);

        db.prepare('INSERT INTO users (uuid, username, email, password, emailToken, emailTokenExpires) VALUES(?,?,?,?,?,?)')
        .run(result.value.uuid, result.value.username, result.value.email, result.value.password, result.value.emailToken, result.value.emailTokenExpires.toSQLString());

        return res.status(200).json({
            success: true,
            message: "Registration Success",
        });
    } catch (error) {
        console.error("signup-error", error);
        return res.status(500).json({
            error: true,
            message: "Cannot Register",
        });
    }
};

export const Login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                error: true,
                message: "Cannot authorize user.",
            });
        }
        //1. Find if any account with that email exists in DB
        const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
        // NOT FOUND - Throw error
        if (!user) {
            return res.status(404).json({
                error: true,
                message: "Account not found",
            });
        }
        //2. Throw error if account is not activated
        if (!user.active) {
            return res.status(400).json({
                error: true,
                message: "You must verify your email to activate your account",
            });
        }
        //3. Verify the password is valid
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
            return res.status(400).json({
                error: true,
                message: "Invalid credentials",
            });
        }

        //Generate Access token
        const { error, token } = await generateToken(user.email, user.uuid);
        if (error) {
            return res.status(500).json({
                error: true,
                message: "Couldn't create access token. Please try again later",
            });
        }

        db.prepare(`UPDATE users SET accessToken = ? WHERE id = ?`).run(token, user.id);

        //Success
        return res.send({
            success: true,
            message: "User logged in successfully",
            accessToken: token,
            uuid: user.uuid
        });
    } catch (err) {
        console.error("Login error", err);
        return res.status(500).json({
            error: true,
            message: "Couldn't login. Please try again later.",
        });
    }
};

export const GetUser = async (req, res) => {
    try {
        const uuid = req.decodedToken.id; //Destruction syntax
        const user = db.prepare("SELECT * FROM users WHERE uuid = ?").get(uuid);
        const { email, active, createdAt, name, username } = user;
        return res.send({
            success: true,
            email: email,
            username: username,
            active: active,
            createdAt: createdAt,
            uuid: uuid
        });
    } catch (error) {
        console.error("user-not-found-error", error);
        return res.stat(500).json({
            error: true,
            message: error.message,
        });
    }
};

export const Activate = async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.json({
                error: true,
                status: 400,
                message: "Please make a valid request",
            });
        }

        const user = db.prepare("SELECT * FROM users WHERE email = ? AND emailToken = ?").get(email, code);
        if (!user) {
            return res.status(400).json({
                error: true,
                message: "Invalid details",
            });
        } else {
            if (user.active)
                return res.send({
                    error: true,
                    message: "Account already activated",
                    status: 400,
                });

            db.prepare("UPDATE users SET emailToken = ?, emailTokenExpires = NULL, active = TRUE WHERE id = ?").run("", user.id);
            return res.status(200).json({
                success: true,
                message: "Account activated.",
            });
        }
    } catch (error) {
        console.error("activation-error", error);
        return res.status(500).json({
            error: true,
            message: error.message,
        });
    }
};

export const ForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.send({
                status: 400,
                error: true,
                message: "Cannot be processed",
            });
        }
        const user = db.prepare("SELECT * FROM users WHERE email = ?").run(email);
        if (!user) {
            return res.send({
                success: true,
                message:
                    "If that email address is in our database, we will send you an email to reset your password",
            });
        }
        let code = Math.floor(100000 + Math.random() * 900000);
        let response = await sendEmail(user.email, code);
        if (response.error) {
            return res.status(500).json({
                error: true,
                message: "Couldn't send mail. Please try again later.",
            });
        }
        let expiry = Date.now() + 60 * 1000 * 15;
        db.update("UPDATE users SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE id = ?").run(code, expiry, user.id);
        return res.send({
            success: true,
            message:
                "If that email address is in our database, we will send you an email to reset your password",
        });
    } catch (error) {
        console.error("forgot-password-error", error);
        return res.status(500).json({
            error: true,
            message: error.message,
        });
    }
};

export const ResetPassword = async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;
        if (!token || !newPassword || !confirmPassword) {
            return res.status(403).json({
                error: true,
                message:
                    "Couldn't process request. Please provide all mandatory fields",
            });
        }
        const user = db.prepare("SELECT * FROM users WHERE resetPasswordToken = ?, resetPasswordExpires > ?").get(req.body.token, Date.now());

        if (!user) {
            return res.send({
                error: true,
                message: "Password reset token is invalid or has expired.",
            });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                error: true,
                message: "Passwords didn't match",
            });
        }
        const hash = await hashPassword(req.body.newPassword);
        db.prepare("UPDATE users SET password = ?, resetPasswordToken = NULL, resetPasswordExpires = ?").run(hash, "");
        return res.send({
            success: true,
            message: "Password has been changed",
        });
    } catch (error) {
        console.error("reset-password-error", error);
        return res.status(500).json({
            error: true,
            message: error.message,
        });
    }
};
