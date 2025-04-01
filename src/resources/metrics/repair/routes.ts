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
import { createNewRepairMetricHandler } from "./handlers";
import { RepairMetricsModel } from "./model";
import {
  createRepairMetricsJoiSchema,
  updateRepairMetricsJoiSchema,
} from "./validations";

const repairMetricsRouter = Router();

repairMetricsRouter
  .route("/")
  // @desc   Get all repair metrics
  // @route  GET api/v1/metrics/repair
  // @access Private/Admin/Manager
  .get(verifyJWTMiddleware, getQueriedResourcesHandler(RepairMetricsModel))
  // @desc   Create a new repair metric
  // @route  POST api/v1/metrics/repair
  // @access Private/Admin/Manager
  .post(
    validateSchemaMiddleware(createRepairMetricsJoiSchema, "schema"),
    createNewRepairMetricHandler(RepairMetricsModel),
  );

// @desc   Delete many repair metrics
// @route  DELETE api/v1/metrics/repair/delete-many
// @access Private/Admin/Manager
repairMetricsRouter.route("/delete-many").delete(
  verifyJWTMiddleware,
  deleteManyResourcesHandler(RepairMetricsModel),
);

repairMetricsRouter
  .route("/:resourceId")
  // @desc   Get a repair metric by its ID
  // @route  GET api/v1/metric/repair/:resourceId
  // @access Private/Admin/Manager
  .get(verifyJWTMiddleware, getResourceByIdHandler(RepairMetricsModel))
  // @desc   Delete a repair metric by its ID
  // @route  DELETE api/v1/metric/repair/:resourceId
  // @access Private/Admin/Manager
  .delete(verifyJWTMiddleware, deleteResourceByIdHandler(RepairMetricsModel))
  // @desc   Update a repair metric by its ID
  // @route  PATCH api/v1/metric/repair/:resourceId
  // @access Private/Admin/Manager
  .patch(
    verifyJWTMiddleware,
    validateSchemaMiddleware(updateRepairMetricsJoiSchema),
    updateResourceByIdHandler(RepairMetricsModel),
  );

export { repairMetricsRouter };
