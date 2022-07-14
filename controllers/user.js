import bcrypt from 'bcrypt';
import joi from 'joi';
import { v4 as uuid } from 'uuid';
import { db } from '../db/database.js';
import { generateToken } from '../helpers/generateToken.js';
import { sendEmail } from '../helpers/mailer.js';

const userSchema = joi.object({
    email: joi.string().email({ minDomainSegments: 2 }),
    password: joi.string().required().min(4),
    username: joi.string().required(),
    confirmPassword: joi.string().valid(joi.ref("password")).required(),
});

const hashPassword = async (password) => {
    try {
        const salt = await bcrypt.genSalt(10); // 10 rounds
        return await bcrypt.hash(password, salt);
    } catch (error) {
        throw new Error("Hashing failed", error);
    }
};

const comparePasswords = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

export const Signup = async (req, res) => {
    try {
        const result = userSchema.validate(req.body);
        if (result.error) {
            console.log(result.error.message);
            return res.status(400).json({
                message: result.error.message,
            });
        }

        //Check if the email has been already registered.
        let user = db.prepare('SELECT * FROM users WHERE email = ?').get(result.value.email);
        if (user) {
            return res.status(400).json({
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
                message: "Couldn't send verification email.",
            });
        }

        result.value.emailToken = code;
        result.value.emailTokenExpires = new Date(expiry);

        db.prepare('INSERT INTO users (uuid, username, email, password, emailToken, emailTokenExpires) VALUES(?,?,?,?,?,?)')
            .run(result.value.uuid, result.value.username, result.value.email, result.value.password, result.value.emailToken, result.value.emailTokenExpires.toSQLString());

        return res.status(200).json({
            message: "Registration Success",
        });
    } catch (error) {
        console.error("signup-error", error);
        return res.status(500).json({
            message: "Cannot Register",
        });
    }
};

export const Login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                message: "Cannot authorize user.",
            });
        }
        //1. Find if any account with that email exists in DB
        const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
        // NOT FOUND - Throw error
        if (!user) {
            return res.status(404).json({
                message: "Account not found",
            });
        }
        //2. Throw error if account is not activated
        if (!user.active) {
            return res.status(400).json({
                message: "You must verify your email to activate your account",
            });
        }
        //3. Verify the password is valid
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
            return res.status(400).json({
                message: "Invalid credentials",
            });
        }

        //Generate Access token
        const { error, token } = await generateToken(user.email, user.uuid);
        if (error) {
            return res.status(500).json({
                message: "Couldn't create access token. Please try again later",
            });
        }

        db.prepare(`UPDATE users SET accessToken = ? WHERE id = ?`).run(token, user.id);

        //Success
        return res.send({
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
        const { email, active, createdAt, updatedAt, username } = user;
        return res.send({
            email,
            username,
            active,
            createdAt,
            updatedAt,
            uuid
        });
    } catch (error) {
        console.error("user-not-found-error", error);
        return res.status(500).json({
            error: true,
            message: error.message,
        });
    }
};

export const Activate = async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({
                message: "Please make a valid request",
            });
        }

        const user = db.prepare("SELECT * FROM users WHERE email = ? AND emailToken = ?").get(email, code);
        if (!user) {
            return res.status(400).json({
                message: "Invalid details",
            });
        } else {
            if (user.active)
                return res.status(400).send({
                    message: "Account already activated",
                });

            db.prepare("UPDATE users SET emailToken = ?, emailTokenExpires = NULL, active = TRUE WHERE id = ?").run("", user.id);
            return res.status(200).json({
                message: "Account activated.",
            });
        }
    } catch (error) {
        console.error("activation-error", error);
        return res.status(500).json({
            message: error.message,
        });
    }
};

export const ForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).send({
                message: "Cannot be processed",
            });
        }
        const user = db.prepare("SELECT * FROM users WHERE email = ?").run(email);
        if (!user) {
            return res.send({
                message: "If that email address is in our database, we will send you an email to reset your password",
            });
        }
        let code = Math.floor(100000 + Math.random() * 900000);
        let response = await sendEmail(user.email, code);
        if (response.error) {
            return res.status(500).json({
                message: "Couldn't send mail. Please try again later.",
            });
        }
        let expiry = Date.now() + 60 * 1000 * 15;
        db.update("UPDATE users SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE id = ?").run(code, expiry, user.id);
        return res.send({
            message: "If that email address is in our database, we will send you an email to reset your password",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: error.message,
        });
    }
};

export const ResetPassword = async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;
        if (!token || !newPassword || !confirmPassword) {
            return res.status(403).json({
                message: "Couldn't process request. Please provide all mandatory fields",
            });
        }
        const user = db.prepare("SELECT * FROM users WHERE resetPasswordToken = ?, resetPasswordExpires > ?").get(req.body.token, Date.now());

        if (!user) {
            return res.send({
                message: "Password reset token is invalid or has expired.",
            });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                message: "Passwords didn't match",
            });
        }
        const hash = await hashPassword(req.body.newPassword);
        db.prepare("UPDATE users SET password = ?, resetPasswordToken = NULL, resetPasswordExpires = ?").run(hash, "");
        return res.send({
            message: "Password has been changed",
        });
    } catch (error) {
        console.error("reset-password-error", error);
        return res.status(500).json({
            message: error.message,
        });
    }
};
