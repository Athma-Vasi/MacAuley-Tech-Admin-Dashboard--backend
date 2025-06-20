import { type UserDocument, UserModel, type UserSchema } from "./model";

import type { Model } from "mongoose";
import {
  createNewResourceService,
  getResourceByFieldService,
} from "../../services";
import type { CreateNewResourceRequest, HttpServerResponse } from "../../types";

import { HASH_SALT_ROUNDS } from "../../constants";
import {
  catchHandlerError,
  handleErrorResult,
  handleNoneOption,
  handleSuccessResult,
} from "../../handlers";
import { createSafeErrorResult, hashStringSafe } from "../../utils";

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
        await handleErrorResult({
          request,
          response,
          safeErrorResult: usernameExistsResult,
        });
        return;
      }
      if (usernameExistsResult.val.some) {
        await handleErrorResult({
          request,
          response,
          safeErrorResult: createSafeErrorResult(
            "Username already exists",
          ),
        });
        return;
      }

      const emailExistsResult = await getResourceByFieldService({
        filter: { email: schema.email },
        model,
      });
      if (emailExistsResult.err) {
        await handleErrorResult({
          request,
          response,
          safeErrorResult: emailExistsResult,
        });
        return;
      }
      if (emailExistsResult.val.some) {
        await handleErrorResult({
          request,
          response,
          safeErrorResult: createSafeErrorResult(
            "Email already exists",
          ),
        });
        return;
      }

      const hashPasswordResult = await hashStringSafe({
        saltRounds: HASH_SALT_ROUNDS,
        stringToHash: schema.password,
      });
      if (hashPasswordResult.err) {
        await handleErrorResult({
          request,
          response,
          safeErrorResult: hashPasswordResult,
        });
        return;
      }
      if (hashPasswordResult.val.none) {
        handleNoneOption({
          message: "Error hashing password",
          request,
          response,
        });
        return;
      }

      const userCreationResult = await createNewResourceService(
        { ...schema, password: hashPasswordResult.val.val },
        UserModel,
      );
      if (userCreationResult.err) {
        await handleErrorResult({
          request,
          response,
          safeErrorResult: userCreationResult,
        });
        return;
      }
      if (userCreationResult.val.none) {
        handleNoneOption({
          message: "Error creating user",
          request,
          response,
        });
        return;
      }

      handleSuccessResult({
        request,
        response,
        safeSuccessResult: userCreationResult,
      });
      return;
    } catch (error: unknown) {
      await catchHandlerError({ error, request, response });
      return;
    }
  };
}

export { createNewUserHandler };
