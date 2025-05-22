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
      const { accessToken, schema } = request.body;

      const createFinancialMetricResult = await createNewResourceService(
        schema,
        model,
      );

      if (createFinancialMetricResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            createFinancialMetricResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        response.status(200).json(
          createHttpResponseError({
            error: createFinancialMetricResult.val.data,
            request,
          }),
        );
        return;
      }

      if (createFinancialMetricResult.val.data.none) {
        response.status(200).json(
          createHttpResponseError({
            error: Some("Financial Metric not created"),
            request,
          }),
        );
        return;
      }

      response.status(200).json(
        createHttpResponseSuccess({
          accessToken: Some(accessToken),
          data: createFinancialMetricResult.val.data,
        }),
      );
    } catch (error: unknown) {
      await createNewResourceService(
        createErrorLogSchema(
          {
            data: Some(error),
            message: Some("Error creating financial metric"),
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

export { createNewFinancialMetricHandler };
