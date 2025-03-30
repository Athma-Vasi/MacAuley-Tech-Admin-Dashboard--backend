import { Response } from "express";
import { Model } from "mongoose";
import {
    createNewResourceService,
    getQueriedResourcesService,
    getQueriedTotalResourcesService,
} from "../services";
import {
    CreateNewResourceRequest,
    DBRecord,
    GetQueriedResourceRequest,
    HttpResult,
    HttpServerResponse,
} from "../types";
import {
    createErrorLogSchema,
    createHttpResultError,
    createHttpResultSuccess,
} from "../utils";

function createNewResourceHandler<Doc extends DBRecord = DBRecord>(
    model: Model<Doc>,
) {
    return async (
        request: CreateNewResourceRequest,
        response: Response<HttpResult>,
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
                    createHttpResultError({ status: 400 }),
                );
                return;
            }

            response
                .status(201)
                .json(
                    createHttpResultSuccess({
                        accessToken,
                        data: [createResourceResult.safeUnwrap().data],
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

function getQueriedResourcesHandler<Doc extends DBRecord = DBRecord>(
    model: Model<Doc>,
) {
    return async (
        request: GetQueriedResourceRequest,
        response: HttpServerResponse,
    ) => {
        try {
            let { accessToken, newQueryFlag, totalDocuments } = request.body;

            const {
                filter,
                projection,
                options,
            } = request.query;

            console.group("getQueriedResourcesHandler");
            console.log("filter", JSON.stringify(filter, null, 2));
            console.log("options", options);
            console.log("projection", projection);
            console.log("totalDocuments", totalDocuments);
            console.groupEnd();

            // only perform a countDocuments scan if a new query is being made
            if (newQueryFlag) {
                const totalResult = await getQueriedTotalResourcesService({
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
                            createHttpResultError({ status: 400 }),
                        );
                    return;
                }

                totalDocuments = totalResult.safeUnwrap().data ?? 0;
            }

            const getResourcesResult = await getQueriedResourcesService({
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
                    .json(createHttpResultError({ status: 400 }));
                return;
            }

            const unwrappedResult = getResourcesResult.safeUnwrap();
            if (unwrappedResult === undefined) {
                response
                    .status(200)
                    .json(createHttpResultError({ status: 404 }));
                return;
            }

            const { kind, data } = unwrappedResult;
            if (kind === "notFound" || data === undefined) {
                response
                    .status(200)
                    .json(createHttpResultError({ status: 404 }));
                return;
            }

            response.status(200).json(
                createHttpResultSuccess({
                    accessToken,
                    data,
                    pages: Math.ceil(
                        totalDocuments / Number(options?.limit ?? 10),
                    ),

                    totalDocuments,
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

            response.status(200).json(
                createHttpResultError({}),
            );
        }
    };
}
