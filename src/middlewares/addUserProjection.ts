import type { NextFunction, Request, Response } from "express";
import { PROPERTY_DESCRIPTOR } from "../constants";

function addUserProjection(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  const projection = ["-password"];
  Object.defineProperty(request.query, "projection", {
    value: projection,
    ...PROPERTY_DESCRIPTOR,
  });

  return next();
}

export { addUserProjection };
