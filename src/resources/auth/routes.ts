import { Router } from "express";
import expressFileUpload from "express-fileupload";
import {
  extractSchemaMiddleware,
  fileExtensionLimiterMiddleware,
  fileInfoExtractorMiddleware,
  fileSizeLimiterMiddleware,
  modifyRequestWithQuery,
  verifyJWTMiddleware,
} from "../../middlewares";
import { validateSchemaMiddleware } from "../../middlewares/validateSchema";
import { UserModel } from "../user";
import { createUserJoiSchema } from "../user/validations";
import {
  checkUsernameOrEmailExistsHandler,
  loginUserHandler,
  logoutUserHandler,
  registerUserHandler,
} from "./handlers";
import { AuthModel } from "./model";
import { createAuthSessionJoiSchema } from "./validations";

const authRouter = Router();

// TODO: ADD LOGIN LIMITER FOR PRODUCTION
// authRouter.route('/login').post(loginLimiter, loginUserController);

// @desc   Login user
// @route  POST /auth/login
// @access Public
authRouter.route("/login").post(
  validateSchemaMiddleware(createAuthSessionJoiSchema, "schema"),
  loginUserHandler(AuthModel),
);

// @desc   Register user
// @route  POST /auth/register
// @access Public
authRouter.route("/register").post(
  modifyRequestWithQuery,
  expressFileUpload({ createParentPath: true }),
  // filesPayloadExistsMiddleware,
  fileSizeLimiterMiddleware,
  fileExtensionLimiterMiddleware,
  fileInfoExtractorMiddleware,
  extractSchemaMiddleware,
  validateSchemaMiddleware(createUserJoiSchema, "schema"),
  registerUserHandler(UserModel),
);

// @see https://stackoverflow.com/questions/3521290/logging-out-get-or-post
// @desc   Logout user
// @route  POST /auth/logout
// @access Private
authRouter.route("/logout").post(
  verifyJWTMiddleware,
  logoutUserHandler(AuthModel),
);

// @desc   Check if username or email exists
// @route  GET /auth/check
// @access Public
authRouter.route("/check").get(
  modifyRequestWithQuery,
  checkUsernameOrEmailExistsHandler(UserModel),
);

export { authRouter };
