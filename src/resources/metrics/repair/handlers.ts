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
import type { RepairMetricsDocument, RepairMetricsSchema } from "./model";

// @desc   Create new Repair Metric
// @route  POST /api/v1/metrics/repair
// @access Private/Admin/Manager
function createNewRepairMetricHandler(
  model: Model<RepairMetricsDocument>,
) {
  return async (
    request: CreateNewResourceRequest<RepairMetricsSchema>,
    response: HttpServerResponse<RepairMetricsDocument>,
  ) => {
    try {
      const createRepairMetricResult = await createNewResourceService(
        request.body.schema ?? {},
        model,
      );
      if (createRepairMetricResult.err) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: createRepairMetricResult,
        });
        return;
      }
      if (createRepairMetricResult.val.none) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: createSafeErrorResult(
            "Repair Metrics creation failed",
          ),
        });
        return;
      }

      handleServiceSuccessResult({
        request,
        response,
        safeSuccessResult: createRepairMetricResult,
      });
      return;
    } catch (error: unknown) {
      await catchHandlerError({ error, request, response });
      return;
    }
  };
}

export { createNewRepairMetricHandler };
