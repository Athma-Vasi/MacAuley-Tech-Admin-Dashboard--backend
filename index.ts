import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import type { NextFunction, Request, Response } from "express";
import express from "express";
import helmet from "helmet";
import createHttpError from "http-errors";
import morgan from "morgan";

/** config */

dotenv.config();
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

/** routes */
// app.use("/auth", authRouter);
// app.use("/users", userRouter);

app.use((_: Request, __: Response, next: NextFunction) => {
    return next(new createHttpError.NotFound("This route does not exist"));
});

/** error handling */
// app.use(errorHandler)
