import { Router } from "express";
import { createMongoDbQueryObject } from "../../middlewares";
import { errorLogRouter } from "../errorLog";
import { userRouter } from "../user";
import { usernameEmailSetRouter } from "../usernameEmailSet";

const versionOneRouter = Router();
versionOneRouter.use(createMongoDbQueryObject);

// route: /api/v1
versionOneRouter.use("/error-log", errorLogRouter);
versionOneRouter.use("/user", userRouter);
versionOneRouter.use("/username-email-set", usernameEmailSetRouter);

export { versionOneRouter };
