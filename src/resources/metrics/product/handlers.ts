import type { Response } from "express";
import type { Model } from "mongoose";
import { createNewResourceService } from "../../../services";
import type { CreateNewResourceRequest, DBRecord } from "../../../types";
import {
  createErrorLogSchema,
  createHttpResponseError,
  createHttpResponseSuccess,
} from "../../../utils";
import { ErrorLogModel } from "../../errorLog";
import type { ProductMetricsSchema } from "./model";

// @desc   Create new Product Metric
// @route  POST /api/v1/metrics/product
// @access Private/Admin/Manager
function createNewProductMetricHandler<
  Doc extends DBRecord = DBRecord,
>(
  model: Model<Doc>,
) {
  return async (
    request: CreateNewResourceRequest<ProductMetricsSchema>,
    response: Response,
  ) => {
    try {
      const { accessToken, schema } = request.body;

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
          createHttpResponseError({
            message: "Unable to create product metric. Please try again.",
          }),
        );
        return;
      }

      const productMetricUnwrapped =
        createProductMetricResult.safeUnwrap().data;

      if (productMetricUnwrapped.length === 0) {
        response.status(200).json(
          createHttpResponseError({
            message: "Unable to create product metric. Please try again.",
          }),
        );
        return;
      }

      response.status(200).json(
        createHttpResponseSuccess({
          accessToken,
          data: productMetricUnwrapped,
          message: "Product Metric created successfully",
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

      response.status(200).json(createHttpResponseError({}));
    }
  };
}

export { createNewProductMetricHandler };
