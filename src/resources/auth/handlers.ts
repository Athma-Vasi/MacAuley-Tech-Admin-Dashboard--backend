import { Response } from "express";
import jwt from "jsonwebtoken";
import { Model } from "mongoose";
import { CONFIG } from "../../config";
import { ACCESS_TOKEN_EXPIRY } from "../../constants";
import {
    createNewResourceService,
    getResourceByFieldService,
} from "../../services";
import { DBRecord, HttpResult, LoginUserRequest } from "../../types";
import {
    compareHashedStringWithPlainStringSafe,
    createErrorLogSchema,
    createHttpResultError,
    createHttpResultSuccess,
} from "../../utils";
import { ErrorLogModel } from "../errorLog";
import { UserDocument, UserModel } from "../user";

// @desc   Login user
// @route  POST /auth/login
// @access Public
function loginUserHandler<
    Doc extends DBRecord = DBRecord,
>(
    model: Model<Doc>,
) {
    return async (
        request: LoginUserRequest,
        response: Response<
            HttpResult<{ userDocument: UserDocument; accessToken: string }>
        >,
    ) => {
        try {
            console.group("loginUserHandler");
            console.log("request.body", request.body);
            console.groupEnd();

            const { schema } = request.body;
            const { username, password } = schema;

            const getUserResult = await getResourceByFieldService({
                filter: { username },
                model: UserModel,
            });

            if (getUserResult.err) {
                await createNewResourceService(
                    createErrorLogSchema(getUserResult.val, request.body),
                    ErrorLogModel,
                );

                response.status(200).json(
                    createHttpResultError({
                        message: "Unable to get user. Please try again!",
                    }),
                );
                return;
            }

            const userDocument = getUserResult.safeUnwrap().data as
                | UserDocument
                | undefined;

            if (userDocument === undefined || userDocument === null) {
                response.status(200).json(
                    createHttpResultError({
                        status: 404,
                        message: "User not found",
                    }),
                );
                return;
            }

            const isPasswordCorrectResult =
                await compareHashedStringWithPlainStringSafe({
                    hashedString: userDocument.password,
                    plainString: password,
                });

            if (isPasswordCorrectResult.err) {
                await createNewResourceService(
                    createErrorLogSchema(
                        isPasswordCorrectResult.val,
                        request.body,
                    ),
                    ErrorLogModel,
                );

                response.status(200).json(
                    createHttpResultError({
                        status: 401,
                        message: "Password incorrect",
                    }),
                );
                return;
            }

            const { ACCESS_TOKEN_SEED } = CONFIG;

            const authSessionSchema: AuthSchema = {
                addressIP: request.ip ?? "",
                // user will be required to log in their session again after 1 day
                expireAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1),
                isValid: true,
                userAgent: request.get("User-Agent") ?? "",
                userId: userDocument._id,
                username: userDocument.username,
            };

            const createAuthSessionResult = await createNewResourceService(
                authSessionSchema,
                model,
            );

            if (createAuthSessionResult.err) {
                await createNewResourceService(
                    createErrorLogSchema(
                        createAuthSessionResult.val,
                        request.body,
                    ),
                    ErrorLogModel,
                );

                response.status(200).json(
                    createHttpResultError({
                        message: "Unable to create session. Please try again!",
                    }),
                );
                return;
            }

            const sessionId = createAuthSessionResult.safeUnwrap().data?._id;

            if (!sessionId) {
                response.status(200).json(
                    createHttpResultError({
                        message: "Unable to create session. Please try again!",
                    }),
                );
                return;
            }

            const accessToken = jwt.sign(
                {
                    userInfo: {
                        userId: userDocument._id,
                        username: userDocument.username,
                        roles: userDocument.roles,
                    },
                    sessionId,
                },
                ACCESS_TOKEN_SEED,
                { expiresIn: ACCESS_TOKEN_EXPIRY },
            );

            const userDocPartial = Object.entries(userDocument).reduce(
                (userDocAcc, [key, value]) => {
                    if (key === "password") {
                        return userDocAcc;
                    }
                    userDocAcc[key] = value;

                    return userDocAcc;
                },
                Object.create(null),
            );

            response.status(200).json(
                createHttpResultSuccess({
                    accessToken,
                    data: [userDocPartial],
                }),
            );
        } catch (error: unknown) {
            await createNewResourceService(
                createErrorLogSchema(
                    error,
                    request.body,
                ),
                ErrorLogModel,
            );

            response.status(200).json(createHttpResultError({}));
        }
    };
}
