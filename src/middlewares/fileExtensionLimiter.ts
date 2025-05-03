import path from "node:path";

import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import type { FileUploadObject } from "../types";

// creates a closure that takes in an array of allowed file extensions and returns a middleware function
function fileExtensionLimiterMiddleware(
    request: Request,
    _response: Response,
    next: NextFunction,
) {
    const ALLOWED_FILE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

    // this middleware only runs if filesPayloadExistsMiddleware and fileSizeLimiterMiddleware has passed - files cannot be undefined
    const files = request.files as unknown as
        | FileUploadObject
        | FileUploadObject[];

    if (!files || (Array.isArray(files) && files.length === 0)) {
        next();
        return;
    }

    const filesWithDisallowedExtensions = Object.entries(files).reduce<
        FileUploadObject[]
    >((acc, [_, fileObject]) => {
        const fileExtension = path.extname(fileObject.name);
        if (!ALLOWED_FILE_EXTENSIONS.has(fileExtension)) {
            acc.push(fileObject);
        }
        return acc;
    }, []);

    console.log("\n");
    console.group("fileExtensionLimiterMiddleware");
    console.log({ files });
    console.log({ filesWithDisallowedExtensions });
    console.groupEnd();

    if (filesWithDisallowedExtensions.length > 0) {
        const progressiveApostrophe = filesWithDisallowedExtensions.length > 1
            ? "'s"
            : " ";
        const properVerb = filesWithDisallowedExtensions.length > 1
            ? " are"
            : "is";

        const message =
            `Upload failed. The following file ${progressiveApostrophe}${properVerb} not allowed: ${
                filesWithDisallowedExtensions
                    .map((file) => file.name)
                    .join(", ")
            }. Allowed extensions are: ${
                Array.from(ALLOWED_FILE_EXTENSIONS).join(", ")
            }`;

        return next(new createHttpError.UnprocessableEntity(message));
    }

    next();
    return;
}

export { fileExtensionLimiterMiddleware };
