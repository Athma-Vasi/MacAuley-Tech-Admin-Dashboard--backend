import type { NextFunction, Request, Response } from "express";
import { PROPERTY_DESCRIPTOR } from "../constants";

function addPasswordProjection(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  const projection = request.query.projection as string | string[] | undefined;

  console.group("addPasswordProjection");
  console.log("projection", projection);
  console.groupEnd();

  if (!projection) {
    Object.defineProperty(request.query, "projection", {
      value: ["-password"],
      ...PROPERTY_DESCRIPTOR,
    });
    next();
    return;
  }

  if (Array.isArray(projection)) {
    Object.defineProperty(request.query, "projection", {
      value: projection.length > 0
        ? [...projection, "-password"]
        : ["-password"],
      ...PROPERTY_DESCRIPTOR,
    });
    next();
    return;
  }

  if (typeof projection === "string") {
    if (!projection.includes("password")) {
      Object.defineProperty(request.query, "projection", {
        value: projection.concat(",password"),
        ...PROPERTY_DESCRIPTOR,
      });
      next();
      return;
    }
  }

  next();
  return;
}

export { addPasswordProjection };
