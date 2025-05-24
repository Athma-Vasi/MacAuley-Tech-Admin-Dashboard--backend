import type { Model } from "mongoose";
import {
  catchHandlerError,
  handleServiceErrorResult,
  handleServiceSuccessResult,
} from "../../../handlers";
import { createNewResourceService } from "../../../services";
import type {
  CreateNewResourceRequest,
  HttpServerResponse,
} from "../../../types";
import { createSafeErrorResult } from "../../../utils";
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
      const createProductMetricResult = await createNewResourceService(
        request.body.schema ?? {},
        model,
      );
      if (createProductMetricResult.err) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: createProductMetricResult,
        });
        return;
      }
      if (createProductMetricResult.val.none) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: createSafeErrorResult(
            "Product Metrics creation failed",
          ),
        });
        return;
      }

      handleServiceSuccessResult({
        request,
        response,
        safeSuccessResult: createProductMetricResult,
      });
      return;
    } catch (error: unknown) {
      await catchHandlerError({ error, request, response });
      return;
    }
  };
}

export { createNewProductMetricHandler };
