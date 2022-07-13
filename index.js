import express from "express";
import cors from "cors";
import userRouter from './routes/users.js';
import carRouter from './routes/cars.js';
import keyRouter from './routes/keys.js';
import moment from 'moment';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.use("/users", userRouter);
app.use("/cars", carRouter);
app.use("/keys", keyRouter);

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});


// temp
Date.prototype.toSQLString = function(){
    return moment(this).format("YYYY-MM-DD hh:mm:ss");
}