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
import { createNewFinancialMetricHandler } from "./handlers";
import { FinancialMetricsModel } from "./model";
import {
  createFinancialMetricsJoiSchema,
  updateFinancialMetricsJoiSchema,
} from "./validations";

const financialMetricsRouter = Router();

financialMetricsRouter
  .route("/")
  // @desc   Get all financial metrics
  // @route  GET api/v1/metrics/financial
  // @access Private/Admin/Manager
  .get(verifyJWTMiddleware, getQueriedResourcesHandler(FinancialMetricsModel))
  // @desc   Create a new financial metric
  // @route  POST api/v1/metrics/financial
  // @access Private/Admin/Manager
  .post(
    validateSchemaMiddleware(createFinancialMetricsJoiSchema, "schema"),
    createNewFinancialMetricHandler(FinancialMetricsModel),
  );

// @desc   Delete many financial metrics
// @route  DELETE api/v1/metrics/financial/delete-many
// @access Private/Admin/Manager
financialMetricsRouter.route("/delete-many").delete(
  verifyJWTMiddleware,
  deleteManyResourcesHandler(FinancialMetricsModel),
);

financialMetricsRouter
  .route("/:resourceId")
  // @desc   Get a financial metric by its ID
  // @route  GET api/v1/metric/financial/:resourceId
  // @access Private/Admin/Manager
  .get(verifyJWTMiddleware, getResourceByIdHandler(FinancialMetricsModel))
  // @desc   Delete a financial metric by its ID
  // @route  DELETE api/v1/metric/financial/:resourceId
  // @access Private/Admin/Manager
  .delete(verifyJWTMiddleware, deleteResourceByIdHandler(FinancialMetricsModel))
  // @desc   Update a financial metric by its ID
  // @route  PATCH api/v1/metric/financial/:resourceId
  // @access Private/Admin/Manager
  .patch(
    verifyJWTMiddleware,
    validateSchemaMiddleware(updateFinancialMetricsJoiSchema),
    updateResourceByIdHandler(FinancialMetricsModel),
  );

export { financialMetricsRouter };
