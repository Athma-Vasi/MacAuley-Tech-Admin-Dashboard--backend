import type { Request, Response } from "express";
import type { Model } from "mongoose";
import type { Err, OkImpl, Option } from "ts-results";
import { ErrorLogModel } from "../resources/errorLog";
import {
  createNewResourceService,
  deleteManyResourcesService,
  deleteResourceByIdService,
  getQueriedResourcesByUserService,
  getQueriedResourcesService,
  getQueriedTotalResourcesService,
  getResourceByIdService,
  updateResourceByIdService,
} from "../services";
import type {
  CreateNewResourceRequest,
  GetQueriedResourceRequest,
  GetResourceByIdRequest,
  HttpServerResponse,
  RecordDB,
  SafeError,
  UpdateResourceByIdRequest,
} from "../types";
import {
  createErrorLogSchema,
  createHttpResponseError,
  createHttpResponseSuccess,
  createSafeErrorResult,
} from "../utils";

async function catchHandlerError<
  Req extends Request = Request,
  Res extends Response = Response,
>(
  { error, request, response, status = 500 }: {
    error: unknown;
    request: Req;
    response: Res;
    status?: number;
  },
): Promise<void> {
  try {
    const safeErrorResult = createSafeErrorResult(error);
    const createNewResourceResult = await createNewResourceService(
      createErrorLogSchema(
        safeErrorResult,
        request,
      ),
      ErrorLogModel,
    );
    const responsePayload = createHttpResponseError({
      safeErrorResult: createNewResourceResult.err
        ? createNewResourceResult
        : safeErrorResult,
      request,
      status,
    });

    response.status(200).json(responsePayload);
  } catch (error: unknown) {
    response.status(200).json(
      createHttpResponseError({
        safeErrorResult: createSafeErrorResult(error),
        request,
        status,
      }),
    );
  }
}

function handleSuccessResult<
  Data = unknown,
  Req extends Request = Request,
  Res extends Response = Response,
>(
  {
    pages,
    request,
    response,
    safeSuccessResult,
    status = 200,
    totalDocuments,
    triggerLogout,
  }: {
    pages?: number;
    request: Req;
    response: Res;
    safeSuccessResult: OkImpl<Option<NonNullable<Data>>>;
    status?: number;
    totalDocuments?: number;
    triggerLogout?: boolean;
  },
): void {
  response.status(200).json(
    createHttpResponseSuccess({
      pages,
      request,
      safeSuccessResult,
      status,
      totalDocuments,
      triggerLogout,
    }),
  );
}

function handleNoneOption<
  Req extends Request = Request,
  Res extends Response = Response,
>(
  {
    message,
    request,
    response,
    status = 404,
    triggerLogout,
  }: {
    message?: string;
    request: Req;
    response: Res;
    status?: number;
    triggerLogout?: boolean;
  },
): void {
  try {
    const responsePayload = createHttpResponseError({
      request,
      safeErrorResult: createSafeErrorResult(
        message ?? "No data found",
      ),
      status,
      triggerLogout,
    });
    response.status(200).json(responsePayload);
  } catch (error: unknown) {
    response.status(200).json(
      createHttpResponseError({
        safeErrorResult: createSafeErrorResult(error),
        request,
      }),
    );
  }
}

async function handleErrorResult<
  Req extends Request = Request,
  Res extends Response = Response,
>(
  {
    request,
    response,
    safeErrorResult,
    status = 500,
    triggerLogout,
  }: {
    request: Req;
    response: Res;
    safeErrorResult: Err<SafeError>;
    status?: number;
    triggerLogout?: boolean;
  },
): Promise<void> {
  try {
    const createResourceResult = await createNewResourceService(
      createErrorLogSchema(
        safeErrorResult,
        request,
      ),
      ErrorLogModel,
    );

    if (createResourceResult.err || createResourceResult.val.none) {
      throw createResourceResult.val;
    }

    const responsePayload = createHttpResponseError({
      request,
      safeErrorResult,
      status,
      triggerLogout,
    });

    response.status(200).json(responsePayload);
  } catch (error: unknown) {
    response.status(200).json(
      createHttpResponseError({
        safeErrorResult: createSafeErrorResult(error),
        request,
      }),
    );
  }
}

function createNewResourceHandler<
  Doc extends Record<string, unknown> = RecordDB,
>(
  model: Model<Doc>,
) {
  return async (
    request: CreateNewResourceRequest,
    response: HttpServerResponse<Doc>,
  ) => {
    try {
      const { schema } = request.body;
      if (!schema) {
        handleErrorResult({
          request,
          response,
          safeErrorResult: createSafeErrorResult(
            "Schema is required to create a new resource",
          ),
          status: 400,
        });
        return;
      }

      const createResourceResult = await createNewResourceService(
        schema,
        model,
      );
      if (createResourceResult.err) {
        await handleErrorResult({
          request,
          response,
          safeErrorResult: createResourceResult,
          status: 400,
        });
        return;
      }

      if (createResourceResult.val.none) {
        handleNoneOption({
          message: "Resource creation failed",
          request,
          response,
        });
        return;
      }

      handleSuccessResult({
        request,
        response,
        safeSuccessResult: createResourceResult,
      });
      return;
    } catch (error: unknown) {
      await catchHandlerError({ error, request, response });
      return;
    }
  };
}

function getQueriedResourcesHandler<
  Doc extends Record<string, unknown> = RecordDB,
>(
  model: Model<Doc>,
) {
  return async (
    request: GetQueriedResourceRequest,
    response: HttpServerResponse<Doc[]>,
  ) => {
    try {
      let { newQueryFlag, totalDocuments } = request.body;

      const {
        filter,
        projection,
        options,
      } = request.query;

      // only perform a countDocuments scan if a new query is being made
      // such as a new search or filter (pagination does not count as a new query)
      if (newQueryFlag) {
        const totalResult = await getQueriedTotalResourcesService<Doc>({
          filter,
          model,
        });
        if (totalResult.err) {
          await handleErrorResult({
            request,
            response,
            safeErrorResult: totalResult,
            status: 400,
          });
          return;
        }

        totalDocuments = totalResult.val.none ? 0 : totalResult.val.val;
      }

      const getResourcesResult = await getQueriedResourcesService<Doc>({
        filter,
        model,
        options,
        projection,
      });
      if (getResourcesResult.err) {
        await handleErrorResult({
          request,
          response,
          safeErrorResult: getResourcesResult,
          status: 400,
        });
        return;
      }
      // if not an empty array
      if (getResourcesResult.val.none) {
        handleNoneOption({
          message: "Unable to find resources",
          request,
          response,
        });
        return;
      }

      handleSuccessResult({
        request,
        response,
        safeSuccessResult: getResourcesResult,
        pages: Math.ceil(
          totalDocuments / Number(options?.limit ?? 10),
        ),
        totalDocuments,
      });
      return;
    } catch (error: unknown) {
      await catchHandlerError({ error, request, response });
      return;
    }
  };
}

function getQueriedResourcesByUserHandler<
  Doc extends Record<string, unknown> = RecordDB,
>(
  model: Model<Doc>,
) {
  return async (
    request: GetQueriedResourceRequest,
    response: HttpServerResponse<Doc[]>,
  ) => {
    try {
      const { newQueryFlag, userId } = request.body;
      let { totalDocuments } = request.body;
      const { filter, projection, options } = request.query;
      const filterWithUserId = { ...filter, userId };

      // only perform a countDocuments scan if a new query is being made
      if (newQueryFlag) {
        const totalResult = await getQueriedTotalResourcesService<Doc>({
          filter: filterWithUserId,
          model,
        });
        if (totalResult.err) {
          await handleErrorResult({
            request,
            response,
            safeErrorResult: totalResult,
            status: 400,
          });
          return;
        }

        totalDocuments = totalResult.val.none ? 0 : totalResult.val.val;
      }

      const getResourcesResult = await getQueriedResourcesByUserService({
        filter,
        model,
        options,
        projection,
      });
      if (getResourcesResult.err) {
        await handleErrorResult({
          request,
          response,
          safeErrorResult: getResourcesResult,
          status: 400,
        });
        return;
      }
      // if not an empty array
      if (getResourcesResult.val.none) {
        handleNoneOption({
          message: "Unable to find resources for the user",
          request,
          response,
        });
        return;
      }

      handleSuccessResult({
        request,
        response,
        safeSuccessResult: getResourcesResult,
        pages: Math.ceil(
          totalDocuments / Number(options?.limit ?? 10),
        ),
        totalDocuments,
      });
      return;
    } catch (error: unknown) {
      await catchHandlerError({ error, request, response });
      return;
    }
  };
}

function updateResourceByIdHandler<
  Doc extends Record<string, unknown> = RecordDB,
>(
  model: Model<Doc>,
) {
  return async (
    request: UpdateResourceByIdRequest,
    response: HttpServerResponse<Doc>,
  ) => {
    try {
      const { resourceId } = request.params;
      const {
        documentUpdate: { fields, updateOperator },
      } = request.body;

      const updateResourceResult = await updateResourceByIdService({
        fields,
        model,
        resourceId,
        updateOperator,
      });
      if (updateResourceResult.err) {
        await handleErrorResult({
          request,
          response,
          safeErrorResult: updateResourceResult,
          status: 400,
        });
        return;
      }

      handleSuccessResult({
        request,
        response,
        safeSuccessResult: updateResourceResult,
      });
      return;
    } catch (error: unknown) {
      await catchHandlerError({ error, request, response });
      return;
    }
  };
}

function getResourceByIdHandler<Doc extends Record<string, unknown> = RecordDB>(
  model: Model<Doc>,
) {
  return async (
    request: GetResourceByIdRequest,
    response: HttpServerResponse<Doc>,
  ) => {
    try {
      const { resourceId } = request.params;

      const getResourceResult = await getResourceByIdService(
        resourceId,
        model,
      );
      if (getResourceResult.err) {
        await handleErrorResult({
          request,
          response,
          safeErrorResult: getResourceResult,
          status: 404,
        });
        return;
      }

      handleSuccessResult({
        request,
        response,
        safeSuccessResult: getResourceResult,
      });
      return;
    } catch (error: unknown) {
      await catchHandlerError({ error, request, response });
      return;
    }
  };
}

function deleteResourceByIdHandler<
  Doc extends Record<string, unknown> = RecordDB,
>(
  model: Model<Doc>,
) {
  return async (
    request: GetResourceByIdRequest,
    response: HttpServerResponse<boolean>,
  ) => {
    try {
      const { resourceId } = request.params;

      const deletedResult = await deleteResourceByIdService(
        resourceId,
        model,
      );
      if (deletedResult.err) {
        await handleErrorResult({
          request,
          response,
          safeErrorResult: deletedResult,
          status: 404,
        });
        return;
      }
      if (deletedResult.val.none) {
        handleNoneOption({
          message: "Resource not found or already deleted",
          request,
          response,
        });
        return;
      }

      handleSuccessResult({
        request,
        response,
        safeSuccessResult: deletedResult,
      });
      return;
    } catch (error: unknown) {
      await catchHandlerError({ error, request, response });
      return;
    }
  };
}

function deleteManyResourcesHandler<
  Doc extends Record<string, unknown> = RecordDB,
>(
  model: Model<Doc>,
) {
  return async (
    request: GetQueriedResourceRequest,
    response: HttpServerResponse<boolean>,
  ) => {
    try {
      const deletedResult = await deleteManyResourcesService({ model });
      if (deletedResult.err) {
        await handleErrorResult({
          request,
          response,
          safeErrorResult: deletedResult,
          status: 404,
        });
        return;
      }
      if (deletedResult.val.none) {
        handleNoneOption({
          message: "Some resources were not deleted",
          request,
          response,
        });
        return;
      }

      handleSuccessResult({
        request,
        response,
        safeSuccessResult: deletedResult,
      });
      return;
    } catch (error: unknown) {
      await catchHandlerError({ error, request, response });
      return;
    }
  };
}

export {
  catchHandlerError,
  createNewResourceHandler,
  deleteManyResourcesHandler,
  deleteResourceByIdHandler,
  getQueriedResourcesByUserHandler,
  getQueriedResourcesHandler,
  getResourceByIdHandler,
  handleErrorResult,
  handleNoneOption,
  handleSuccessResult,
  updateResourceByIdHandler,
};
