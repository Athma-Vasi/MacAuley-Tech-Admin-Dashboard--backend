import { Router } from "express";

import {
  deleteManyResourcesHandler,
  deleteResourceByIdHandler,
  getQueriedResourcesByUserHandler,
  getQueriedResourcesHandler,
  getResourceByIdHandler,
  updateResourceByIdHandler,
} from "../../../handlers";
import {
  validateSchemaMiddleware,
  verifyJWTMiddleware,
} from "../../../middlewares";
import { createNewProductMetricHandler } from "./handlers";
import { ProductMetricModel } from "./model";
import {
  createProductMetricsJoiSchema,
  updateProductMetricsJoiSchema,
} from "./validations";

const productMetricRouter = Router();

productMetricRouter
  .route("/")
  // @desc   Get all product metrics
  // @route  GET api/v1/metrics/product
  // @access Private/Admin/Manager
  .get(verifyJWTMiddleware, getQueriedResourcesHandler(ProductMetricModel))
  // @desc   Create a new product metric
  // @route  POST api/v1/metrics/product
  // @access Private/Admin/Manager
  .post(
    validateSchemaMiddleware(createProductMetricsJoiSchema, "schema"),
    createNewProductMetricHandler(ProductMetricModel),
  );

// @desc   Delete many product metrics
// @route  DELETE api/v1/metrics/product/delete-many
// @access Private/Admin/Manager
productMetricRouter.route("/delete-many").delete(
  verifyJWTMiddleware,
  deleteManyResourcesHandler(ProductMetricModel),
);

productMetricRouter
  .route("/:resourceId")
  // @desc   Get a product metric by its ID
  // @route  GET api/v1/metric/product/:resourceId
  // @access Private/Admin/Manager
  .get(verifyJWTMiddleware, getResourceByIdHandler(ProductMetricModel))
  // @desc   Delete a product metric by its ID
  // @route  DELETE api/v1/metric/product/:resourceId
  // @access Private/Admin/Manager
  .delete(verifyJWTMiddleware, deleteResourceByIdHandler(ProductMetricModel))
  // @desc   Update a product metric by its ID
  // @route  PATCH api/v1/metric/product/:resourceId
  // @access Private/Admin/Manager
  .patch(
    verifyJWTMiddleware,
    validateSchemaMiddleware(updateProductMetricsJoiSchema),
    updateResourceByIdHandler(ProductMetricModel),
  );

export { productMetricRouter };
