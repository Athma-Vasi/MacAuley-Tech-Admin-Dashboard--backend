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
import type { CustomerMetricsDocument, CustomerMetricsSchema } from "./model";

// @desc   Create new Customer Metric
// @route  POST /api/v1/metrics/customer
// @access Private/Admin/Manager
function createNewCustomerMetricHandler(
  model: Model<CustomerMetricsDocument>,
) {
  return async (
    request: CreateNewResourceRequest<CustomerMetricsSchema>,
    response: HttpServerResponse<CustomerMetricsDocument>,
  ) => {
    try {
      const createCustomerMetricResult = await createNewResourceService(
        request.body.schema ?? {},
        model,
      );
      if (createCustomerMetricResult.err) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: createCustomerMetricResult,
        });
        return;
      }
      if (createCustomerMetricResult.val.none) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: createSafeErrorResult(
            "Customer Metrics creation failed",
          ),
        });
        return;
      }

      handleServiceSuccessResult({
        request,
        response,
        safeSuccessResult: createCustomerMetricResult,
      });
      return;
    } catch (error: unknown) {
      await catchHandlerError({ error, request, response });
      return;
    }
  };
}

export { createNewCustomerMetricHandler };
