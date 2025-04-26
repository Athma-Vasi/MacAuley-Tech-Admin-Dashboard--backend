import type { Response } from "express";

import { type UserDocument, UserModel, type UserSchema } from "./model";

import type { Model } from "mongoose";
import {
  createNewResourceService,
  getResourceByFieldService,
} from "../../services";
import type {
  CreateNewResourceRequest,
  CreateNewResourcesBulkRequest,
  DBRecord,
  HttpResult,
} from "../../types";

import { Err, Ok } from "ts-results";
import { HASH_SALT_ROUNDS } from "../../constants";
import {
  createErrorLogSchema,
  createHttpResponseError,
  createHttpResponseSuccess,
  hashStringSafe,
} from "../../utils";
import { ErrorLogModel } from "../errorLog";

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

        response.status(200).json(createHttpResponseError({ status: 500 }));
        return;
      }

      if (usernameExistsResult.val.kind === "success") {
        response.status(200).json(
          createHttpResponseError({
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

        response.status(200).json(createHttpResponseError({}));
        return;
      }

      if (emailExistsResult.val.kind === "success") {
        response.status(200).json(
          createHttpResponseError({
            status: 400,
            message: "Email already exists",
          }),
        );
        return;
      }

      const hashPasswordResult = await hashStringSafe({
        saltRounds: HASH_SALT_ROUNDS,
        stringToHash: schema.password,
      });

      if (hashPasswordResult.err) {
        await createNewResourceService(
          createErrorLogSchema(hashPasswordResult.val, request.body),
          ErrorLogModel,
        );

        response.status(200).json(
          createHttpResponseError({
            message: "Unable to hash password. Please try again.",
          }),
        );
        return;
      }

      const hashedPasswordUnwrapped = hashPasswordResult.safeUnwrap().data;

      if (hashedPasswordUnwrapped.length === 0) {
        response.status(200).json(
          createHttpResponseError({
            message: "Unable to retrieve hashed password. Please try again.",
          }),
        );
        return;
      }

      const [hashedPassword] = hashedPasswordUnwrapped;

      const userCreationResult = await createNewResourceService(
        { ...schema, password: hashedPassword },
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

        response.status(200).json(createHttpResponseError({ status: 500 }));
        return;
      }

      response.status(200).json(
        createHttpResponseSuccess({
          data: userCreationResult.safeUnwrap().data,
          accessToken: "",
        }),
      );
    } catch (error: unknown) {
      await createNewResourceService(
        createErrorLogSchema(
          error,
          request.body,
        ),
        ErrorLogModel,
      );

      response.status(200).json(createHttpResponseError({}));
    }
  };
}

// TODO DELETE
// @desc  Create new users in bulk
// @route POST /api/v1/user/bulk
// @access Public
function createNewUsersBulkHandler<
  Doc extends DBRecord = DBRecord,
>(model: Model<Doc>) {
  return async (
    request: CreateNewResourcesBulkRequest<Doc>,
    response: Response<HttpResult<Doc>>,
  ) => {
    try {
      const schemas = request.body.schemas as Array<UserSchema>;
      const userCreationResults = await Promise.all(
        schemas.map(async (schema) => {
          const hashPasswordResult = await hashStringSafe({
            saltRounds: HASH_SALT_ROUNDS,
            stringToHash: schema.password,
          });

          if (hashPasswordResult.err) {
            return new Err("Unable to hash password. Please try again.");
          }

          const hashedPasswordUnwrapped = hashPasswordResult.safeUnwrap().data;

          if (hashedPasswordUnwrapped.length === 0) {
            return new Err(
              "Unable to retrieve hashed password. Please try again.",
            );
          }

          const [hashedPassword] = hashedPasswordUnwrapped;

          const userCreationResult = await createNewResourceService(
            { ...schema, password: hashedPassword },
            model,
          );

          if (userCreationResult.err) {
            return new Err("Error creating user");
          }

          const [userCreationResultUnwrapped] =
            userCreationResult.safeUnwrap().data;

          if (userCreationResultUnwrapped === undefined) {
            return new Err("Could not create user");
          }

          return new Ok(userCreationResultUnwrapped);
        }),
      );

      const errors = userCreationResults.filter((result) => result.err);
      if (errors.length > 0) {
        errors.forEach((error) => {
        });
        response.status(200).json(
          createHttpResponseError({ message: "Error creating users" }),
        );
        return;
      }

      const successes = userCreationResults.filter((result) => result.ok);
      const successesUnwrapped = successes.flatMap((result) =>
        result.safeUnwrap()
      );

      response.status(200).json(
        createHttpResponseSuccess({
          data: successesUnwrapped as any,
          accessToken: "",
        }),
      );
    } catch (error: unknown) {
      response.status(200).json(
        createHttpResponseError({ message: "Erorr in handler" }),
      );
    }
  };
}

export { createNewUserHandler, createNewUsersBulkHandler };
