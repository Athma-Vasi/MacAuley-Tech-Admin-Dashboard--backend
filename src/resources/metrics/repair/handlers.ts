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
import type { RepairMetricsSchema } from "./model";

// @desc   Create new Repair Metric
// @route  POST /api/v1/metrics/repair
// @access Private/Admin/Manager
function createNewRepairMetricHandler<
  Doc extends DBRecord = DBRecord,
>(
  model: Model<Doc>,
) {
  return async (
    request: CreateNewResourceRequest<RepairMetricsSchema>,
    response: Response,
  ) => {
    try {
      const { schema } = request.body;

      const createRepairMetricResult = await createNewResourceService(
        schema,
        model,
      );

      if (createRepairMetricResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            createRepairMetricResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        response.status(200).json(
          createHttpResultError({
            message: "Unable to create repair metric. Please try again.",
          }),
        );
        return;
      }

      response.status(200).json(
        createHttpResultSuccess({
          accessToken: "",
          message: "Repair Metric created successfully",
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

export { createNewRepairMetricHandler };
