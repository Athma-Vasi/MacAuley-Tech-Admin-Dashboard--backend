import type { Request, Response } from "express";

import { Model } from "mongoose";
import {
  createAndNotReturnResourceService,
  createNewResourceService,
  getResourceByFieldService,
} from "../../services";
import { DBRecord, HttpResult } from "../../types";
import {
  createErrorLogSchema,
  createHttpResultError,
  createHttpResultSuccess,
} from "../../utils";
import { ErrorLogModel } from "../errorLog";

type PostUsernameEmailSetRequest = Request & {
  body: {
    schema: {
      username: string[];
      email: string[];
    };
  };
};

// @desc   create usernameEmailSet document
// @route  POST /api/v1/username-email-set
// @access Public
/**
 * @description only runs once to create the document (only one document exists in collection)
 */
function postUsernameEmailSetHandler<
  Doc extends DBRecord = DBRecord,
>(model: Model<Doc>) {
  return async (
    request: PostUsernameEmailSetRequest,
    response: Response<HttpResult>,
  ) => {
    try {
      const { schema } = request.body;

      const resourceCreationResult = await createAndNotReturnResourceService(
        schema,
        model,
      );

      if (resourceCreationResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            resourceCreationResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        response.status(200).json(
          createHttpResultError({}),
        );
        return;
      }

      response.status(200).json(
        createHttpResultSuccess({
          accessToken: "",
          data: [resourceCreationResult.safeUnwrap()],
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

      response.status(200).json(createHttpResultError({}));
    }
  };
}

type CheckUsernameOrEmailExistsRequest = Request & {
  body: {
    fields: { email?: string; username?: string };
  };
};

// @desc   check if username or email exists
// @route  POST /api/v1/username-email-set/check
// @access Public
function checkUsernameOrEmailExistsHandler<
  Doc extends DBRecord = DBRecord,
>(model: Model<Doc>) {
  return async (
    request: CheckUsernameOrEmailExistsRequest,
    response: Response<HttpResult<boolean>>,
  ) => {
    try {
      const { email, username } = request.body.fields;

      const filter = email
        ? { email: { $in: [email] } }
        : { username: { $in: [username] } };

      const isUsernameOrEmailExistsResult = await getResourceByFieldService({
        filter,
        model,
      });

      if (isUsernameOrEmailExistsResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            isUsernameOrEmailExistsResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        response.status(200).json(
          createHttpResultError({}),
        );
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

export { checkUsernameOrEmailExistsHandler, postUsernameEmailSetHandler };
