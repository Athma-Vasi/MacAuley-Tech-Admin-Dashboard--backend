// @desc   Create new Product Metric
// @route  POST /api/v1/product-metrics

import type { Response } from "express";
import type { Model } from "mongoose";
import { createNewResourceService } from "../../../services";
import type { CreateNewResourceRequest, DBRecord } from "../../../types";
import {
    createErrorLogSchema,
    createHttpResultError,
    createHttpResultSuccess,
} from "../../../utils";
import { ErrorLogModel } from "../../errorLog";
import type { ProductMetricSchema } from "./model";

// @access Private/Admin/Manager
function createNewProductMetricHandler<
    Doc extends DBRecord = DBRecord,
>(
    model: Model<Doc>,
) {
    return async (
        request: CreateNewResourceRequest<ProductMetricSchema>,
        response: Response,
    ) => {
        try {
            const { schema } = request.body;

            const createProductMetricResult = await createNewResourceService(
                schema,
                model,
            );

            if (createProductMetricResult.err) {
                await createNewResourceService(
                    createErrorLogSchema(
                        createProductMetricResult.val,
                        request.body,
                    ),
                    ErrorLogModel,
                );

                response.status(200).json(
                    createHttpResultError({
                        message: "Unable to register. Please try again.",
                    }),
                );
                return;
            }

            response.status(200).json(
                createHttpResultSuccess({
                    accessToken: "",
                    message: "Product Metric created successfully",
                }),
            );
        } catch (error: unknown) {}
    };
}

export { createNewProductMetricHandler };
