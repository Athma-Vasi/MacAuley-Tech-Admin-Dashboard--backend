import type { NextFunction, Request, Response } from "express";
import { PROPERTY_DESCRIPTOR } from "../constants";

// used when formData is sent
function extractSchemaMiddleware(
    request: Request,
    _response: Response,
    next: NextFunction,
) {
    const reqBodyField = request.body.schema;
    const schema = JSON.parse(reqBodyField);

    Object.defineProperty(request.body, "schema", {
        value: schema.schema,
        ...PROPERTY_DESCRIPTOR,
    });

    next();
    return;
}

export { extractSchemaMiddleware };
