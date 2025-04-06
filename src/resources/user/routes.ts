import { Router } from "express";

import {
  deleteManyResourcesHandler,
  deleteResourceByIdHandler,
  getQueriedResourcesByUserHandler,
  getQueriedResourcesHandler,
  getResourceByIdHandler,
  updateResourceByIdHandler,
} from "../../handlers";
import {
  addUserProjection,
  validateSchemaMiddleware,
  verifyJWTMiddleware,
} from "../../middlewares";
import { createNewUserHandler } from "./handlers";
import { UserModel } from "./model";
import { createUserJoiSchema, updateUserJoiSchema } from "./validations";

const userRouter = Router();
userRouter.use(addUserProjection);

userRouter
  .route("/")
  // @desc   Get all users
  // @route  GET api/v1/user
  // @access Private/Admin/Manager
  .get(verifyJWTMiddleware, getQueriedResourcesHandler(UserModel))
  // @desc   Create a new user
  // @route  POST api/v1/user
  // @access Private/Admin/Manager
  .post(
    validateSchemaMiddleware(createUserJoiSchema, "schema"),
    createNewUserHandler(UserModel),
  );

// @desc   Delete many users
// @route  DELETE api/v1/user/delete-many
// @access Private/Admin/Manager
userRouter.route("/delete-many").delete(
  verifyJWTMiddleware,
  deleteManyResourcesHandler(UserModel),
);

userRouter
  .route("/:resourceId")
  // @desc   Get an user by their ID
  // @route  GET api/v1/user/:resourceId
  // @access Private/Admin/Manager
  .get(verifyJWTMiddleware, getResourceByIdHandler(UserModel))
  // @desc   Delete an user by their ID
  // @route  DELETE api/v1/user/:resourceId
  // @access Private/Admin/Manager
  .delete(verifyJWTMiddleware, deleteResourceByIdHandler(UserModel))
  // @desc   Update an user by their ID
  // @route  PATCH api/v1/user/:resourceId
  // @access Private/Admin/Manager
  .patch(
    verifyJWTMiddleware,
    validateSchemaMiddleware(updateUserJoiSchema),
    updateResourceByIdHandler(UserModel),
  );

export { userRouter };
