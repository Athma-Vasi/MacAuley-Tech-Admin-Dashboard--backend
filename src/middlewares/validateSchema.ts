import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import type { Schema } from "joi";

function validateSchemaMiddleware(
  schema: Schema,
  fieldName = "documentUpdate", // "${resource}Fields" for POST or "documentUpdate" for PATCH
  options: Record<string, string | number | boolean> = {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true,
  },
) {
  return (request: Request, response: Response, next: NextFunction) => {
    const reqBodyField = request.body[fieldName];
    const fields = fieldName === "documentUpdate"
      ? reqBodyField.fields
      : reqBodyField;

    console.log("\n");
    console.group("validateSchemaMiddleware");
    console.log({ reqBodyField });
    console.log({ fields });
    console.log({ fieldName });
    console.groupEnd();

    const { error } = schema.validate(fields, options);

    if (error) {
      return next(
        new createHttpError.BadRequest(
          `Validation error: ${error.details.map((x) => x.message).join(", ")}`,
        ),
      );
    }

    next();
  };
}

export { validateSchemaMiddleware };
