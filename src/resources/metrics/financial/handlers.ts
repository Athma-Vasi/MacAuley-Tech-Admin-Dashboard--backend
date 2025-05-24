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
import type { FinancialMetricsDocument, FinancialMetricsSchema } from "./model";

// @desc   Create new Financial Metric
// @route  POST /api/v1/metrics/financial
// @access Private/Admin/Manager
function createNewFinancialMetricHandler(
  model: Model<FinancialMetricsDocument>,
) {
  return async (
    request: CreateNewResourceRequest<FinancialMetricsSchema>,
    response: HttpServerResponse<FinancialMetricsDocument>,
  ) => {
    try {
      const createFinancialMetricResult = await createNewResourceService(
        request.body.schema ?? {},
        model,
      );
      if (createFinancialMetricResult.err) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: createFinancialMetricResult,
        });
        return;
      }
      if (createFinancialMetricResult.val.none) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: createSafeErrorResult(
            "Financial Metrics creation failed",
          ),
        });
        return;
      }

      handleServiceSuccessResult({
        request,
        response,
        safeSuccessResult: createFinancialMetricResult,
      });
      return;
    } catch (error: unknown) {
      await catchHandlerError({ error, request, response });
      return;
    }
  };
}

export { createNewFinancialMetricHandler };
