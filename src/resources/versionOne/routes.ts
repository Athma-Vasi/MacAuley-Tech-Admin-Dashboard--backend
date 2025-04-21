import { Router } from "express";
import { modifyRequestWithQuery } from "../../middlewares";
import { errorLogRouter } from "../errorLog";
import { metricsRouter } from "../metrics/routes";
import { userRouter } from "../user";
const versionOneRouter = Router();
versionOneRouter.use(modifyRequestWithQuery);

// route: /api/v1
versionOneRouter.use("/error-log", errorLogRouter);
versionOneRouter.use("/user", userRouter);
versionOneRouter.use("/metrics", metricsRouter);

export { versionOneRouter };
