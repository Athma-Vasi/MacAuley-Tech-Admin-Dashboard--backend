import type { Model } from "mongoose";
import { Some } from "ts-results";
import { createNewResourceService } from "../../../services";
import type {
  CreateNewResourceRequest,
  HttpServerResponse,
} from "../../../types";
import {
  createErrorLogSchema,
  createHttpResponseError,
  createHttpResponseSuccess,
} from "../../../utils";
import { ErrorLogModel } from "../../errorLog";
import type { ProductMetricsDocument, ProductMetricsSchema } from "./model";

// @desc   Create new Product Metric
// @route  POST /api/v1/metrics/product
// @access Private/Admin/Manager
function createNewProductMetricHandler(
  model: Model<ProductMetricsDocument>,
) {
  return async (
    request: CreateNewResourceRequest<ProductMetricsSchema>,
    response: HttpServerResponse<ProductMetricsDocument>,
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
            error: createProductMetricResult.val.data,
            request,
          }),
        );
        return;
      }

      if (createProductMetricResult.val.data.none) {
        response.status(200).json(
          createHttpResponseError({
            error: Some("Product Metric not created"),
            request,
          }),
        );
        return;
      }

      response.status(200).json(
        createHttpResponseSuccess({
          accessToken: Some(accessToken),
          data: createProductMetricResult.val.data,
        }),
      );
    } catch (error: unknown) {
      await createNewResourceService(
        createErrorLogSchema(
          {
            data: Some(error),
            message: Some("Error creating product metric"),
          },
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

export { createNewProductMetricHandler };
