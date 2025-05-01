import { Router } from "express";
import {
    createNewResourceHandler,
    deleteResourceByIdHandler,
    getQueriedResourcesByUserHandler,
    getQueriedResourcesHandler,
    getResourceByIdHandler,
    updateResourceByIdHandler,
} from "../../handlers";
import {
    validateSchemaMiddleware,
    verifyJWTMiddleware,
} from "../../middlewares";
import { FileUploadModel } from "./model";

const fileUploadRouter = Router();

fileUploadRouter.use(
    verifyJWTMiddleware,
    verifyRoles,
    createMongoDbQueryObject,
);

fileUploadRouter
    .route("/")
    // @desc   Get all file uploads
    // @route  GET /file-upload
    // @access Private/Admin/Manager
    .get(getQueriedResourcesHandler(FileUploadModel))
    // @desc   Create a new file upload
    // @route  POST /file-upload
    // @access Private
    .post(
        expressFileUpload({ createParentPath: true }),
        filesPayloadExistsMiddleware,
        fileSizeLimiterMiddleware,
        fileExtensionLimiterMiddleware(ALLOWED_FILE_EXTENSIONS),
        fileInfoExtracterMiddleware,
        validateSchemaMiddleware(createFileUploadJoiSchema, "schema"),
        createNewResourceHandler(FileUploadModel),
    );

// @desc   Get all file uploads by user
// @route  GET /file-upload/user
// @access Private
fileUploadRouter.route("/user").get(
    getQueriedResourcesByUserHandler(FileUploadModel),
);

fileUploadRouter
    .route("/:resourceId")
    // @desc   Get a file upload by its id
    // @route  GET /file-upload/:resourceId
    // @access Private
    .get(getResourceByIdHandler(FileUploadModel))
    // @desc   Delete a file upload by its id
    // @route  DELETE /file-upload/:resourceId
    // @access Private
    .delete(deleteResourceByIdHandler(FileUploadModel))
    // @desc   Patch a file upload by its id
    // @route  PATCH /file-upload/:resourceId
    // @access Private
    .patch(updateResourceByIdHandler(FileUploadModel));

export { fileUploadRouter };
