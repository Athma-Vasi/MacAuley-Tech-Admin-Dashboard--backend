import { Router } from "express";
import {
    createNewResourceHandler,
    deleteManyResourcesHandler,
    deleteResourceByIdHandler,
    getQueriedResourcesByUserHandler,
    getQueriedResourcesHandler,
    getResourceByIdHandler,
    updateResourceByIdHandler,
} from "../../handlers";
import { ErrorLogModel } from "./model";

const errorLogRouter = Router();

errorLogRouter
    .route("/")
    // @desc   Get all error logs
    // @route  GET api/v1/error-log
    // @access Private/Admin/Manager
    .get(getQueriedResourcesHandler(ErrorLogModel))
    // @desc   Create a new error log
    // @route  POST api/v1/error-log
    // @access Private
    .post(createNewResourceHandler(ErrorLogModel));

// @desc    Delete many error logs
// @route   DELETE api/v1/error-log/delete-many
// @access  Private
errorLogRouter.route("/delete-many").delete(
    deleteManyResourcesHandler(ErrorLogModel),
);

// @desc   Get all error logs by user
// @route  GET api/v1/error-log/user
// @access Admin/Manager
errorLogRouter.route("/user").get(
    getQueriedResourcesByUserHandler(ErrorLogModel),
);

errorLogRouter
    .route("/:resourceId")
    // @desc   Get an error log
    // @route  GET api/v1/error-log/:resourceId
    // @access Private
    .get(getResourceByIdHandler(ErrorLogModel))
    // @desc   Update an error log by its id
    // @route  PATCH api/v1/error-log/:resourceId
    // @access Private/Admin/Manager
    .delete(deleteResourceByIdHandler(ErrorLogModel))
    // @desc   Update an error log by its id
    // @route  PATCH api/v1/error-log/:resourceId
    // @access Private/Admin/Manager
    .patch(updateResourceByIdHandler(ErrorLogModel));

export { errorLogRouter };
