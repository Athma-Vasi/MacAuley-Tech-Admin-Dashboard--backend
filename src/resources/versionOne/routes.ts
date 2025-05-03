import { Router } from "express";
import { modifyRequestWithQuery } from "../../middlewares";
import { errorLogRouter } from "../errorLog";
import { metricsRouter } from "../metrics/routes";
import { userRouter } from "../user";
import { fileUploadRouter } from "../fileUpload/routes";

const versionOneRouter = Router();
versionOneRouter.use(modifyRequestWithQuery);

// route: /api/v1
versionOneRouter.use("/error-log", errorLogRouter);
versionOneRouter.use("/file-upload", fileUploadRouter);
versionOneRouter.use("/metrics", metricsRouter);
versionOneRouter.use("/user", userRouter);

export { versionOneRouter };
