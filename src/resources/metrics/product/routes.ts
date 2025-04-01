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
import { createNewProductMetricHandler } from "./handlers";
import { ProductMetricsModel } from "./model";
import {
  createProductMetricsJoiSchema,
  updateProductMetricsJoiSchema,
} from "./validations";

const productMetricsRouter = Router();

productMetricsRouter
  .route("/")
  // @desc   Get all product metrics
  // @route  GET api/v1/metrics/product
  // @access Private/Admin/Manager
  .get(verifyJWTMiddleware, getQueriedResourcesHandler(ProductMetricsModel))
  // @desc   Create a new product metric
  // @route  POST api/v1/metrics/product
  // @access Private/Admin/Manager
  .post(
    validateSchemaMiddleware(createProductMetricsJoiSchema, "schema"),
    createNewProductMetricHandler(ProductMetricsModel),
  );

// @desc   Delete many product metrics
// @route  DELETE api/v1/metrics/product/delete-many
// @access Private/Admin/Manager
productMetricsRouter.route("/delete-many").delete(
  verifyJWTMiddleware,
  deleteManyResourcesHandler(ProductMetricsModel),
);

productMetricsRouter
  .route("/:resourceId")
  // @desc   Get a product metric by its ID
  // @route  GET api/v1/metric/product/:resourceId
  // @access Private/Admin/Manager
  .get(verifyJWTMiddleware, getResourceByIdHandler(ProductMetricsModel))
  // @desc   Delete a product metric by its ID
  // @route  DELETE api/v1/metric/product/:resourceId
  // @access Private/Admin/Manager
  .delete(verifyJWTMiddleware, deleteResourceByIdHandler(ProductMetricsModel))
  // @desc   Update a product metric by its ID
  // @route  PATCH api/v1/metric/product/:resourceId
  // @access Private/Admin/Manager
  .patch(
    verifyJWTMiddleware,
    validateSchemaMiddleware(updateProductMetricsJoiSchema),
    updateResourceByIdHandler(ProductMetricsModel),
  );

export { productMetricsRouter };
