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
import type { FinancialMetricsSchema } from "./model";

// @desc   Create new Financial Metric
// @route  POST /api/v1/metrics/financial
// @access Private/Admin/Manager
function createNewFinancialMetricHandler<
  Doc extends DBRecord = DBRecord,
>(
  model: Model<Doc>,
) {
  return async (
    request: CreateNewResourceRequest<FinancialMetricsSchema>,
    response: Response,
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
            message: "Unable to create financial metric. Please try again.",
          }),
        );
        return;
      }

      const financialMetricUnwrapped =
        createFinancialMetricResult.safeUnwrap().data;

      if (financialMetricUnwrapped.length === 0) {
        response.status(200).json(
          createHttpResponseError({
            message: "Unable to create financial metric. Please try again.",
          }),
        );
        return;
      }

      response.status(200).json(
        createHttpResponseSuccess({
          accessToken,
          data: financialMetricUnwrapped,
          message: "Financial Metric created successfully",
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

export { createNewFinancialMetricHandler };
