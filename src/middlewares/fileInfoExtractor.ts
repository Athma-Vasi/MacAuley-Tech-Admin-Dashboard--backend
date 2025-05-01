import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import type { FileUploadObject } from "../types";

/**
 * This middleware extracts the file information from the request object and adds it to the request body.
 */
function fileInfoExtracterMiddleware(
    request: Request,
    _response: Response,
    next: NextFunction,
) {
    // this middleware only runs if filesPayloadExistsMiddleware, fileSizeLimiterMiddleware, and fileExtensionCheckerMiddleware have passed - files cannot be undefined
    const files = request.files as unknown as
        | FileUploadObject
        | FileUploadObject[];

    // just a lil stitious...
    if (!files || (Array.isArray(files) && files.length === 0)) {
        return next(
            new createHttpError.BadRequest("No files found in request object"),
        );
    }

    const PROPERTY_DESCRIPTOR: PropertyDescriptor = {
        writable: true,
        enumerable: true,
        configurable: true,
    };

    Object.defineProperty(request.body, "fileUploads", {
        value: [],
        ...PROPERTY_DESCRIPTOR,
    });

    Object.entries(files).forEach((file: [string, FileUploadObject]) => {
        const [_, { data, name, mimetype, size, encoding }] = file;
        const fileInfoObject = {
            uploadedFile: data,
            fileName: name,
            fileExtension: mimetype.split("/")[1],
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

    console.log("\n");
    console.group("fileInfoExtracterMiddleware");
    console.log({ files });
    console.log({ fileUploads: request.body.fileUploads });
    console.groupEnd();

    return next();
}

export { fileInfoExtracterMiddleware };
