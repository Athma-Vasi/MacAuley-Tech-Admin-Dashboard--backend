import type { Request, Response } from "express";
import type { Model } from "mongoose";
import type { Err } from "ts-results";
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

async function catchHandlerError(
  { error, request, response, status = 500 }: {
    error: unknown;
    request: CreateNewResourceRequest;
    response: Response;
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

async function handleServiceError(
  { request, response, safeErrorResult, status = 500 }: {
    safeErrorResult: Err<SafeError>;
    request: Request;
    response: Response;
    status?: number;
  },
): Promise<void> {
  try {
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
      const createResourceResult = await createNewResourceService(
        request.body.schema ?? {},
        model,
      );
      if (createResourceResult.err) {
        await handleServiceError({
          request,
          response,
          safeErrorResult: createResourceResult,
          status: 400,
        });
        return;
      }

      response
        .status(201)
        .json(
          createHttpResponseSuccess({
            safeSuccessResult: createResourceResult,
            request,
          }),
        );
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
      if (newQueryFlag) {
        const totalResult = await getQueriedTotalResourcesService<Doc>({
          filter,
          model,
        });
        if (totalResult.err) {
          await handleServiceError({
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
        await handleServiceError({
          request,
          response,
          safeErrorResult: getResourcesResult,
          status: 400,
        });
        return;
      }

      response.status(200).json(
        createHttpResponseSuccess({
          request,
          safeSuccessResult: getResourcesResult,
          pages: Math.ceil(
            totalDocuments / Number(options?.limit ?? 10),
          ),
          totalDocuments,
        }),
      );
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
          await handleServiceError({
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
        await handleServiceError({
          request,
          response,
          safeErrorResult: getResourcesResult,
          status: 400,
        });
        return;
      }

      response.status(200).json(
        createHttpResponseSuccess({
          request,
          safeSuccessResult: getResourcesResult,
          pages: Math.ceil(
            totalDocuments / Number(options?.limit ?? 10),
          ),
          totalDocuments,
        }),
      );
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
        await handleServiceError({
          request,
          response,
          safeErrorResult: updateResourceResult,
          status: 400,
        });
        return;
      }

      response
        .status(200)
        .json(
          createHttpResponseSuccess({
            request,
            safeSuccessResult: updateResourceResult,
          }),
        );
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
        await handleServiceError({
          request,
          response,
          safeErrorResult: getResourceResult,
          status: 404,
        });
        return;
      }

      response
        .status(200)
        .json(
          createHttpResponseSuccess({
            request,
            safeSuccessResult: getResourceResult,
          }),
        );
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
        await handleServiceError({
          request,
          response,
          safeErrorResult: deletedResult,
          status: 404,
        });
        return;
      }

      response.status(200).json(
        createHttpResponseSuccess({
          request,
          safeSuccessResult: deletedResult,
        }),
      );
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
        await handleServiceError({
          request,
          response,
          safeErrorResult: deletedResult,
          status: 404,
        });
        return;
      }

      response.status(200).json(
        createHttpResponseSuccess({
          request,
          safeSuccessResult: deletedResult,
        }),
      );
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
  updateResourceByIdHandler,
};
