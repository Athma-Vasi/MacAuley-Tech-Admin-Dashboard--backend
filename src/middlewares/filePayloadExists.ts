import type { NextFunction, Request, Response } from "express";
import type { FileUploadObject } from "../types";
import createHttpError from "http-errors";

function filesPayloadExistsMiddleware(
    request: Request,
    _response: Response,
    next: NextFunction,
) {
    const files = request.files as
        | FileUploadObject
        | FileUploadObject[]
        | undefined;

    if (!files || (Array.isArray(files) && files.length === 0)) {
        return next(
            new createHttpError.BadRequest("No files found in request object"),
        );
    }

    return next();
}

export { filesPayloadExistsMiddleware };
