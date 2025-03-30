import { Router } from "express";

import { validateSchemaMiddleware } from "../../middlewares/validateSchema";
import {
  checkUsernameOrEmailExistsHandler,
  postUsernameEmailSetHandler,
} from "./usernameEmailSet.handler";
import { UsernameEmailSetModel } from "./usernameEmailSet.model";
import { createUsernameEmailSetJoiSchema } from "./usernameEmailSet.validation";

const usernameEmailSetRouter = Router();

usernameEmailSetRouter
  .route("/")
  .post(
    validateSchemaMiddleware(
      createUsernameEmailSetJoiSchema,
      "schema",
    ),
    postUsernameEmailSetHandler(UsernameEmailSetModel),
  );

usernameEmailSetRouter.route("/check").post(
  checkUsernameOrEmailExistsHandler(UsernameEmailSetModel),
);

export { usernameEmailSetRouter };
