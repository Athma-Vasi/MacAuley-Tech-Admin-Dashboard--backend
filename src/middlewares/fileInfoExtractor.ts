import type { NextFunction, Request, Response } from "express";
import { PROPERTY_DESCRIPTOR } from "../constants";
import type { FileExtension } from "../resources/fileUpload/model";
import type { FileInfoObject, FileUploadObject } from "../types";

/**
 * This middleware extracts the file information from the request object and adds it to the request body.
 */
function fileInfoExtractorMiddleware(
    request: Request,
    _response: Response,
    next: NextFunction,
) {
    // this middleware only runs if filesPayloadExistsMiddleware, fileSizeLimiterMiddleware, and fileExtensionCheckerMiddleware have passed - files cannot be undefined
    const files = request.files as unknown as
        | FileUploadObject
        | FileUploadObject[];

    if (!files || (Array.isArray(files) && files.length === 0)) {
        next();
        return;
    }

    Object.defineProperty(request.body, "fileUploads", {
        value: [],
        ...PROPERTY_DESCRIPTOR,
    });

    Object.entries(files).forEach((file: [string, FileUploadObject]) => {
        const [_, { data, name, mimetype, size, encoding }] = file;
        const fileInfoObject: FileInfoObject = {
            uploadedFile: data,
            fileName: name,
            fileExtension: mimetype.split("/")[1] as FileExtension,
            fileSize: size,
            fileMimeType: mimetype,
            fileEncoding: encoding,
        };

        request.body.fileUploads.push(fileInfoObject);
    });

    Object.defineProperty(request, "files", {
        value: void 0,
        ...PROPERTY_DESCRIPTOR,
    });

    next();
    return;
}

export { fileInfoExtractorMiddleware };
