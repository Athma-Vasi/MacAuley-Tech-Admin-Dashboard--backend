import { Router } from "express";
import { createMongoDbQueryObject } from "../../middlewares";
import { errorLogRouter } from "../errorLog";
import { metricsRouter } from "../metrics/routes";
import { userRouter } from "../user";
const versionOneRouter = Router();
versionOneRouter.use(createMongoDbQueryObject);

// route: /api/v1
versionOneRouter.use("/error-log", errorLogRouter);
versionOneRouter.use("/user", userRouter);
versionOneRouter.use("/metrics", metricsRouter);

export { versionOneRouter };
