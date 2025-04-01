import { Router } from "express";

import {
  deleteManyResourcesHandler,
  deleteResourceByIdHandler,
  getQueriedResourcesHandler,
  getResourceByIdHandler,
  updateResourceByIdHandler,
} from "../../../handlers";
import {
  validateSchemaMiddleware,
  verifyJWTMiddleware,
} from "../../../middlewares";
import { createNewCustomerMetricHandler } from "./handlers";
import { CustomerMetricsModel } from "./model";
import {
  createCustomerMetricsJoiSchema,
  updateCustomerMetricsJoiSchema,
} from "./validations";

const customerMetricsRouter = Router();

customerMetricsRouter
  .route("/")
  // @desc   Get all customer metrics
  // @route  GET api/v1/metrics/customer
  // @access Private/Admin/Manager
  .get(verifyJWTMiddleware, getQueriedResourcesHandler(CustomerMetricsModel))
  // @desc   Create a new customer metric
  // @route  POST api/v1/metrics/customer
  // @access Private/Admin/Manager
  .post(
    validateSchemaMiddleware(createCustomerMetricsJoiSchema, "schema"),
    createNewCustomerMetricHandler(CustomerMetricsModel),
  );

// @desc   Delete many customer metrics
// @route  DELETE api/v1/metrics/customer/delete-many
// @access Private/Admin/Manager
customerMetricsRouter.route("/delete-many").delete(
  verifyJWTMiddleware,
  deleteManyResourcesHandler(CustomerMetricsModel),
);

customerMetricsRouter
  .route("/:resourceId")
  // @desc   Get a customer metric by its ID
  // @route  GET api/v1/metric/customer/:resourceId
  // @access Private/Admin/Manager
  .get(verifyJWTMiddleware, getResourceByIdHandler(CustomerMetricsModel))
  // @desc   Delete a customer metric by its ID
  // @route  DELETE api/v1/metric/customer/:resourceId
  // @access Private/Admin/Manager
  .delete(verifyJWTMiddleware, deleteResourceByIdHandler(CustomerMetricsModel))
  // @desc   Update a customer metric by its ID
  // @route  PATCH api/v1/metric/customer/:resourceId
  // @access Private/Admin/Manager
  .patch(
    verifyJWTMiddleware,
    validateSchemaMiddleware(updateCustomerMetricsJoiSchema),
    updateResourceByIdHandler(CustomerMetricsModel),
  );

export { customerMetricsRouter };
