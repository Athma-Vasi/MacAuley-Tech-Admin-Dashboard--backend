import bodyParser from "body-parser";
import compression from "compression";
import cors from "cors";
import type { NextFunction, Request, Response } from "express";
import express from "express";
import helmet from "helmet";
import createHttpError from "http-errors";
import mongoose from "mongoose";
import morgan from "morgan";
import { CONFIG } from "./config";
import { connectDB } from "./config/connectDB";
import { apiRouter } from "./resources/api";
import { authRouter } from "./resources/auth";

/** config */

const app = express();

connectDB(CONFIG);

app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(compression());

/** routes */
app.use("/auth", authRouter);
app.use("/api", apiRouter);

app.use((_: Request, __: Response, next: NextFunction) => {
    return next(new createHttpError.NotFound("This route does not exist"));
});

/** error handling */
// app.use(errorHandler)

mongoose.connection.once("open", () => {
    console.log("Connected to MongoDB");

    const { PORT } = CONFIG;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});

mongoose.connection.on("error", (error) => {
    console.error(error);
});
