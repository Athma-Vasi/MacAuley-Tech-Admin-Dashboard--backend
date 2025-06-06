import type { Model } from "mongoose";
import {
  catchHandlerError,
  handleErrorResult,
  handleNoneOption,
  handleSuccessResult,
} from "../../../handlers";
import { createNewResourceService } from "../../../services";
import type {
  CreateNewResourceRequest,
  HttpServerResponse,
} from "../../../types";
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
        await handleErrorResult({
          request,
          response,
          safeErrorResult: createProductMetricResult,
        });
        return;
      }
      if (createProductMetricResult.val.none) {
        handleNoneOption({
          message: "Product Metrics not created",
          request,
          response,
        });
        return;
      }

      handleSuccessResult({
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
