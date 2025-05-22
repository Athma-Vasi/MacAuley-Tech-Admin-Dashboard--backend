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
      const { accessToken, schema } = request.body;

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
          createHttpResponseError({
            error: createRepairMetricResult.val.data,
            request,
          }),
        );
        return;
      }

      if (createRepairMetricResult.val.data.none) {
        response.status(200).json(
          createHttpResponseError({
            error: Some("Repair Metric not created"),
            request,
          }),
        );
        return;
      }

      response.status(200).json(
        createHttpResponseSuccess({
          accessToken: Some(accessToken),
          data: createRepairMetricResult.val.data,
        }),
      );
    } catch (error: unknown) {
      await createNewResourceService(
        createErrorLogSchema(
          {
            data: Some(error),
            message: Some("Error creating repair metric"),
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

export { createNewRepairMetricHandler };
