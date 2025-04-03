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
import type { CustomerMetricsSchema } from "./model";

// @desc   Create new Customer Metric
// @route  POST /api/v1/metrics/customer
// @access Private/Admin/Manager
function createNewCustomerMetricHandler<
  Doc extends DBRecord = DBRecord,
>(
  model: Model<Doc>,
) {
  return async (
    request: CreateNewResourceRequest<CustomerMetricsSchema>,
    response: Response,
  ) => {
    try {
      const { accessToken, schema } = request.body;

      const createCustomerMetricResult = await createNewResourceService(
        schema,
        model,
      );

      if (createCustomerMetricResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            createCustomerMetricResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        response.status(200).json(
          createHttpResultError({
            message: "Unable to create customer metric. Please try again.",
          }),
        );
        return;
      }

      const customerMetricUnwrapped =
        createCustomerMetricResult.safeUnwrap().data;

      if (customerMetricUnwrapped.length === 0) {
        response.status(200).json(
          createHttpResultError({
            message: "Unable to create customer metric. Please try again.",
          }),
        );
        return;
      }

      response.status(200).json(
        createHttpResultSuccess({
          accessToken,
          data: customerMetricUnwrapped,
          message: "Customer Metric created successfully",
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

export { createNewCustomerMetricHandler };
