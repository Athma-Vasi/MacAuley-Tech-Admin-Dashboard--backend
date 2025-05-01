import type { NextFunction, Response } from "express";
import createHttpError from "http-errors";
import type { RequestAfterJWTVerification } from "../types";

function verifyRoles(
    request: RequestAfterJWTVerification,
    _response: Response,
    next: NextFunction,
) {
    {
        const { url, method } = request;
        const { roles, userId } = request.body.userInfo;

        if (method === "POST") {
            // anyone can create a resource
            return next();
        }

        if (method === "GET") {
            // all roles can access /user route: which can also be used to view resources that belong to them (employees route to view their own resources)
            if (url.includes("/user")) {
                return next();
            }

            // else it is a manager/admin accessing a resource that does not belong to them (employee roles not allowed to view others' resources)
            if (roles.includes("Manager") || roles.includes("Admin")) {
                return next();
            }

            return next(
                new createHttpError.Forbidden("User does not have permission"),
            );
        }
        if (method === "PUT" || method === "PATCH") {
            // all roles can access /user route: which can also be used to modify resources that belong to them (employees route to modify their own resources)
            if (url.includes("/user")) {
                return next();
            }

            // else it is a manager/admin accessing a resource that does not belong to them (employee roles not allowed to modify others' resources)
            if (roles.includes("Manager") || roles.includes("Admin")) {
                return next();
            }

            return next(
                new createHttpError.Forbidden("User does not have permission"),
            );
        }
        if (method === "DELETE") {
            // only managers are allowed to delete a resource
            if (roles.includes("Manager")) {
                return next();
            }

            return next(
                new createHttpError.Forbidden("User does not have permission"),
            );
        }

        // if none of the above conditions are met, request is not allowed
        return next(
            new createHttpError.Forbidden("User does not have permission"),
        );
    }
}

export { verifyRoles };
