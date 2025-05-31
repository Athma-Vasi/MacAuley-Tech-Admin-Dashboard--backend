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
    const createResult = await createNewResourceService(
      createErrorLogSchema(
        safeErrorResult,
        request,
      ),
      ErrorLogModel,
    );
    const responsePayload = createHttpResponseError({
      safeErrorResult: createResult.err ? createResult : safeErrorResult,
      request,
      status,
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

function handleServiceSuccessResult<
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

async function handleServiceErrorResult<
  Req extends Request = Request,
  Res extends Response = Response,
>(
  {
    pages,
    request,
    response,
    safeErrorResult,
    status = 500,
    totalDocuments,
    triggerLogout,
  }: {
    pages?: number;
    request: Req;
    response: Res;
    safeErrorResult: Err<SafeError>;
    status?: number;
    totalDocuments?: number;
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
    const responsePayload = createHttpResponseError({
      pages,
      request,
      safeErrorResult: createResourceResult.err
        ? createResourceResult
        : safeErrorResult,
      status,
      totalDocuments,
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
        handleServiceErrorResult({
          request,
          response,
          safeErrorResult: createSafeErrorResult("Schema is required"),
          status: 400,
        });
        return;
      }

      const createResourceResult = await createNewResourceService(
        schema,
        model,
      );
      if (createResourceResult.err) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: createResourceResult,
          status: 400,
        });
        return;
      }

      handleServiceSuccessResult({
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
          await handleServiceErrorResult({
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
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: getResourcesResult,
          status: 400,
        });
        return;
      }

      handleServiceSuccessResult({
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
          await handleServiceErrorResult({
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
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: getResourcesResult,
          status: 400,
        });
        return;
      }

      handleServiceSuccessResult({
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
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: updateResourceResult,
          status: 400,
        });
        return;
      }

      handleServiceSuccessResult({
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
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: getResourceResult,
          status: 404,
        });
        return;
      }

      handleServiceSuccessResult({
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
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: deletedResult,
          status: 404,
        });
        return;
      }

      handleServiceSuccessResult({
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
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: deletedResult,
          status: 404,
        });
        return;
      }

      handleServiceSuccessResult({
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
  handleServiceErrorResult,
  handleServiceSuccessResult,
  updateResourceByIdHandler,
};
