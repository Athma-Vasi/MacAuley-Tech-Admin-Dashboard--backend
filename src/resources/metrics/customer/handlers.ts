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
          createHttpResponseError({
            error: createCustomerMetricResult.val.data,
            request,
          }),
        );
        return;
      }

      if (createCustomerMetricResult.val.data.none) {
        response.status(200).json(
          createHttpResponseError({
            error: Some("Customer Metric not created"),
            request,
          }),
        );
        return;
      }

      response.status(200).json(
        createHttpResponseSuccess({
          accessToken: Some(accessToken),
          data: createCustomerMetricResult.val.data,
        }),
      );
    } catch (error: unknown) {
      await createNewResourceService(
        createErrorLogSchema(
          {
            data: Some(error),
            message: Some("Error creating customer metric"),
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

export { createNewCustomerMetricHandler };
