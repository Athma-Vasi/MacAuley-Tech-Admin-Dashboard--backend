import { Router } from "express";
import {
    createMongoDbQueryObject,
    verifyJWTMiddleware,
} from "../../middlewares";
import { actionsRouter } from "../actions/actions.routes";
import { commentRouter } from "../comment";
import { customerRouter } from "../customer";
import { errorLogRouter } from "../errorLog";
import { fileUploadRouter } from "../fileUpload";
import { productCategoryRouter } from "../productCategory";
import { repairTicketRouter } from "../repairTicket";
import { userRouter } from "../user";
import { usernameEmailSetRouter } from "../usernameEmailSet";

const versionOneRouter = Router();
versionOneRouter.use(
    verifyJWTMiddleware,
    // verifyRoles,
    createMongoDbQueryObject,
);

// route: /api/v1
versionOneRouter.use("/actions", actionsRouter);
versionOneRouter.use("/comment", commentRouter);
versionOneRouter.use("/customer", customerRouter);
versionOneRouter.use("/error-log", errorLogRouter);
versionOneRouter.use("/file-upload", fileUploadRouter);
versionOneRouter.use("/product-category", productCategoryRouter);
versionOneRouter.use("/repair-ticket", repairTicketRouter);
versionOneRouter.use("/user", userRouter);
versionOneRouter.use("/username-email-set", usernameEmailSetRouter);

export { versionOneRouter };
