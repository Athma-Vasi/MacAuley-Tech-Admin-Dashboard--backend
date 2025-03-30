import type { Response } from "express";

import { UserDocument, UserModel } from "./user.model";

import { Model } from "mongoose";
import {
  createNewResourceService,
  getResourceByFieldService,
} from "../../services";
import { CreateNewResourceRequest, DBRecord, HttpResult } from "../../types";

import {
  createErrorLogSchema,
  createHttpResultError,
  createHttpResultSuccess,
} from "../../utils";
import { ErrorLogModel } from "../errorLog";
import {
  updateUsernameEmailSetWithEmailService,
  updateUsernameEmailSetWithUsernameService,
} from "../usernameEmailSet";

// @desc   Create new user
// @route  POST /api/v1/user
// @access Public
function createNewUserHandler<
  Doc extends DBRecord = DBRecord,
>(model: Model<Doc>) {
  return async (
    request: CreateNewResourceRequest<Doc>,
    response: Response<HttpResult<UserDocument>>,
  ) => {
    try {
      const { schema } = request.body;

      const usernameExistsResult = await getResourceByFieldService({
        filter: { username: schema.username },
        model,
      });

      if (usernameExistsResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            usernameExistsResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        response.status(200).json(createHttpResultError({ status: 500 }));
        return;
      }

      if (usernameExistsResult.val.kind === "success") {
        response.status(200).json(
          createHttpResultError({
            status: 400,
            message: "Username already exists",
          }),
        );
        return;
      }

      const emailExistsResult = await getResourceByFieldService({
        filter: { email: schema.email },
        model,
      });

      if (emailExistsResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            emailExistsResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        response.status(200).json(createHttpResultError({}));
        return;
      }

      if (emailExistsResult.val.kind === "success") {
        response.status(200).json(
          createHttpResultError({
            status: 400,
            message: "Email already exists",
          }),
        );
        return;
      }

      const userCreationResult = await createNewResourceService(
        schema,
        UserModel,
      );

      if (userCreationResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            userCreationResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        response.status(200).json(createHttpResultError({ status: 500 }));
        return;
      }

      const { username, email } = schema;

      const updateUsernameEmailSetResult = await Promise.all([
        updateUsernameEmailSetWithUsernameService(username),
        updateUsernameEmailSetWithEmailService(email),
      ]);

      if (updateUsernameEmailSetResult.some((value) => value.err)) {
        await createNewResourceService(
          createErrorLogSchema(
            updateUsernameEmailSetResult,
            request.body,
          ),
          ErrorLogModel,
        );

        response.status(200).json(createHttpResultError({}));
        return;
      }

      response.status(200).json(
        createHttpResultSuccess({ accessToken: "" }),
      );
    } catch (error: unknown) {
      await createNewResourceService(
        createErrorLogSchema(
          error,
          request.body,
        ),
        ErrorLogModel,
      );

      response.status(200).json(createHttpResultError({}));
    }
  };
}

export { createNewUserHandler };
