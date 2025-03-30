import { Response } from "express";
import { Model } from "mongoose";
import { createNewResourceService } from "../services";
import { CreateNewResourceRequest, DBRecord, HttpResult } from "../types";
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
