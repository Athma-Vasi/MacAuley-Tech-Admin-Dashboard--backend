import { type UserDocument, UserModel, type UserSchema } from "./model";

import type { Model } from "mongoose";
import {
  createNewResourceService,
  getResourceByFieldService,
} from "../../services";
import type {
  CreateNewResourceRequest,
  CreateNewResourcesBulkRequest,
  HttpServerResponse,
} from "../../types";

import { None, Some } from "ts-results";
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
function createNewUserHandler(model: Model<UserDocument>) {
  return async (
    request: CreateNewResourceRequest<UserSchema>,
    response: HttpServerResponse<UserDocument>,
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

        response.status(200).json(
          createHttpResponseError({
            error: usernameExistsResult.val.data,
            request,
          }),
        );
        return;
      }

      if (usernameExistsResult.val.data.some) {
        response.status(200).json(
          createHttpResponseError({
            error: Some("Username already exists"),
            request,
            status: 400,
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

        response.status(200).json(createHttpResponseError({
          error: emailExistsResult.val.data,
          request,
        }));
        return;
      }

      if (emailExistsResult.val.data.some) {
        response.status(200).json(
          createHttpResponseError({
            error: Some("Email already exists"),
            request,
            status: 400,
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
            error: hashPasswordResult.val.data,
            request,
          }),
        );
        return;
      }

      if (hashPasswordResult.val.data.none) {
        response.status(200).json(
          createHttpResponseError({
            error: Some(
              "Unable to retrieve hashed password. Please try again.",
            ),
            request,
          }),
        );
        return;
      }

      const userCreationResult = await createNewResourceService(
        { ...schema, password: hashPasswordResult.val.data.safeUnwrap() },
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

        response.status(200).json(createHttpResponseError({
          error: userCreationResult.val.data,
          request,
        }));
        return;
      }

      response.status(200).json(
        createHttpResponseSuccess({
          accessToken: None,
          data: userCreationResult.val.data,
        }),
      );
    } catch (error: unknown) {
      await createNewResourceService(
        createErrorLogSchema(
          { data: Some(error), message: Some("Error creating user") },
          request.body,
        ),
        ErrorLogModel,
      );

      response.status(200).json(createHttpResponseError({
        error: Some(error),
        request,
      }));
    }
  };
}

// TODO DELETE
// @desc  Create new users in bulk
// @route POST /api/v1/user/bulk
// @access Public
function createNewUsersBulkHandler(model: Model<UserDocument>) {
  return async (
    request: CreateNewResourcesBulkRequest<UserSchema>,
    response: HttpServerResponse<string | boolean>,
  ) => {
    try {
      const schemas = request.body.schemas as Array<UserSchema>;
      const userCreationResults = await Promise.all(
        schemas.map(async (schema) => {
          const hashPasswordResult = await hashStringSafe({
            saltRounds: HASH_SALT_ROUNDS,
            stringToHash: schema.password,
          });

          if (hashPasswordResult.err || hashPasswordResult.val.data.none) {
            return hashPasswordResult;
          }

          const userCreationResult = await createNewResourceService(
            { ...schema, password: hashPasswordResult.val.data.safeUnwrap() },
            model,
          );

          if (userCreationResult.err || userCreationResult.val.data.none) {
            return userCreationResult;
          }

          return userCreationResult;
        }),
      );

      const isError = userCreationResults.reduce(
        (acc, result) => {
          if (result.err || result.val.data.none) {
            return true;
          }

          return acc;
        },
        false,
      );

      response.status(200).json(
        isError
          ? createHttpResponseError({
            error: Some("Error creating users"),
            request,
            status: 400,
          })
          : createHttpResponseSuccess({
            data: Some(true),
            accessToken: Some(request.body.accessToken ?? ""),
          }),
      );
    } catch (error: unknown) {
      response.status(200).json(
        createHttpResponseError({
          error: Some(error),
          request,
        }),
      );
    }
  };
}

export { createNewUserHandler, createNewUsersBulkHandler };
