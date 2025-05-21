import type { Model } from "mongoose";
import { Some } from "ts-results";
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
  UpdateResourceByIdRequest,
} from "../types";
import {
  createErrorLogSchema,
  createHttpResponseError,
  createHttpResponseSuccess,
} from "../utils";

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
      const { accessToken, schema } = request.body;

      const createResourceResult = await createNewResourceService(
        schema,
        model,
      );

      if (createResourceResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            createResourceResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        response.status(200).json(
          createHttpResponseError({
            error: createResourceResult.val.data,
            request,
            status: 400,
          }),
        );
        return;
      }

      response
        .status(201)
        .json(
          createHttpResponseSuccess({
            accessToken: Some(accessToken),
            data: createResourceResult.val.data,
          }),
        );
    } catch (error: unknown) {
      await createNewResourceService(
        createErrorLogSchema(
          { data: Some(error), message: Some("Error creating resource") },
          request.body,
        ),
        ErrorLogModel,
      );

      response.status(200).json(
        createHttpResponseError({
          error: Some(error),
          request,
        }),
      );
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
      let { accessToken, newQueryFlag, totalDocuments } = request.body;

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
          await createNewResourceService(
            createErrorLogSchema(
              totalResult.val,
              request.body,
            ),
            ErrorLogModel,
          );

          response
            .status(200)
            .json(
              createHttpResponseError({
                error: totalResult.val.data,
                request,
                status: 400,
              }),
            );
          return;
        }

        totalDocuments = totalResult.val.data.none
          ? 0
          : totalResult.val.data.val;
      }

      const getResourcesResult = await getQueriedResourcesService<Doc>({
        filter,
        model,
        options,
        projection,
      });

      if (getResourcesResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            getResourcesResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        response
          .status(200)
          .json(
            createHttpResponseError({
              error: getResourcesResult.val.data,
              request,
              status: 400,
            }),
          );
        return;
      }

      response.status(200).json(
        createHttpResponseSuccess({
          accessToken: Some(accessToken),
          data: getResourcesResult.val.data,
          pages: Math.ceil(
            totalDocuments / Number(options?.limit ?? 10),
          ),

          totalDocuments,
        }),
      );
    } catch (error: unknown) {
      await createNewResourceService(
        createErrorLogSchema(
          { data: Some(error), message: Some("Error getting resources") },
          request.body,
        ),
        ErrorLogModel,
      );

      response.status(200).json(
        createHttpResponseError({
          error: Some(error),
          request,
        }),
      );
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
      const {
        accessToken,
        newQueryFlag,

        userInfo: { userId },
      } = request.body;
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
          await createNewResourceService(
            createErrorLogSchema(
              totalResult.val,
              request.body,
            ),
            ErrorLogModel,
          );

          response.status(200).json(
            createHttpResponseError({
              error: totalResult.val.data,
              request,
              status: 400,
            }),
          );
          return;
        }

        totalDocuments = totalResult.val.data.none
          ? 0
          : totalResult.val.data.val;
      }

      const getResourcesResult = await getQueriedResourcesByUserService({
        filter,
        model,
        options,
        projection,
      });

      if (getResourcesResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            getResourcesResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        response.status(200).json(
          createHttpResponseError({
            error: getResourcesResult.val.data,
            request,
            status: 400,
          }),
        );
        return;
      }

      response.status(200).json(
        createHttpResponseSuccess({
          accessToken,
          data: getResourcesResult.val.data,
          pages: Math.ceil(
            totalDocuments / Number(options?.limit ?? 10),
          ),

          totalDocuments,
        }),
      );
    } catch (error: unknown) {
      await createNewResourceService(
        createErrorLogSchema(
          { data: Some(error), message: Some("Error getting resources") },
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
        accessToken,
        documentUpdate: { fields, updateOperator },
      } = request.body;

      const updateResourceResult = await updateResourceByIdService({
        fields,
        model,
        resourceId,
        updateOperator,
      });

      if (updateResourceResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            updateResourceResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        response.status(200).json(
          createHttpResponseError({
            error: updateResourceResult.val.data,
            request,
            status: 404,
          }),
        );
        return;
      }

      response
        .status(200)
        .json(
          createHttpResponseSuccess({
            accessToken: Some(accessToken),
            data: updateResourceResult.val.data,
          }),
        );
    } catch (error: unknown) {
      await createNewResourceService(
        createErrorLogSchema(
          { data: Some(error), message: Some("Error updating resource") },
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

function getResourceByIdHandler<Doc extends Record<string, unknown> = RecordDB>(
  model: Model<Doc>,
) {
  return async (
    request: GetResourceByIdRequest,
    response: HttpServerResponse<Doc>,
  ) => {
    try {
      const { accessToken } = request.body;
      const { resourceId } = request.params;

      const getResourceResult = await getResourceByIdService(
        resourceId,
        model,
      );

      if (getResourceResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            getResourceResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        response.status(200).json(
          createHttpResponseError({
            error: getResourceResult.val.data,
            request,
            status: 404,
          }),
        );
        return;
      }

      response
        .status(200)
        .json(
          createHttpResponseSuccess({
            accessToken: Some(accessToken),
            data: getResourceResult.val.data,
          }),
        );
    } catch (error: unknown) {
      await createNewResourceService(
        createErrorLogSchema(
          { data: Some(error), message: Some("Error getting resource") },
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
      const { accessToken } = request.body;
      const { resourceId } = request.params;

      const deletedResult = await deleteResourceByIdService(
        resourceId,
        model,
      );

      if (deletedResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            deletedResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        response.status(200).json(
          createHttpResponseError({
            error: deletedResult.val.data,
            request,
            status: 404,
          }),
        );
        return;
      }

      response.status(200).json(
        createHttpResponseSuccess({
          accessToken: Some(accessToken),
          data: deletedResult.val.data,
        }),
      );
    } catch (error: unknown) {
      await createNewResourceService(
        createErrorLogSchema(
          { data: Some(error), message: Some("Error deleting resource") },
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
      const { accessToken } = request.body;
      const deletedResult = await deleteManyResourcesService({ model });

      if (deletedResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            deletedResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        response.status(200).json(
          createHttpResponseError({
            error: deletedResult.val.data,
            request,
            status: 404,
          }),
        );
        return;
      }

      response.status(200).json(
        createHttpResponseSuccess({
          accessToken: Some(accessToken),
          data: deletedResult.val.data,
        }),
      );
    } catch (error: unknown) {
      await createNewResourceService(
        createErrorLogSchema(
          { data: Some(error), message: Some("Error deleting resources") },
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

export {
  createNewResourceHandler,
  deleteManyResourcesHandler,
  deleteResourceByIdHandler,
  getQueriedResourcesByUserHandler,
  getQueriedResourcesHandler,
  getResourceByIdHandler,
  updateResourceByIdHandler,
};
