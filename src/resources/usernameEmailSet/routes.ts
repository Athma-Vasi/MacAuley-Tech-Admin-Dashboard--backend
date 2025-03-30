import { Router } from "express";

import { validateSchemaMiddleware } from "../../middlewares/validateSchema";
import {
  checkUsernameOrEmailExistsHandler,
  postUsernameEmailSetHandler,
} from "./handlers";
import { UsernameEmailSetModel } from "./model";
import { createUsernameEmailSetJoiSchema } from "./validations";

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
