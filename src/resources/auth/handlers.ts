import type { Response } from "express";
import jwt from "jsonwebtoken";
import type { Model } from "mongoose";
import { CONFIG } from "../../config";
import { ACCESS_TOKEN_EXPIRY, HASH_SALT_ROUNDS } from "../../constants";
import {
  createNewResourceService,
  getResourceByFieldService,
  getResourceByIdService,
  updateResourceByIdService,
} from "../../services";
import type {
  CreateNewResourceRequest,
  DBRecord,
  DecodedToken,
  HttpResult,
  LoginUserRequest,
  RequestAfterJWTVerification,
} from "../../types";
import {
  compareHashedStringWithPlainStringSafe,
  createErrorLogSchema,
  createHttpResultError,
  createHttpResultSuccess,
  decodeJWTSafe,
  hashStringSafe,
  verifyJWTSafe,
} from "../../utils";
import { ErrorLogModel } from "../errorLog";
import {
  DAYS_PER_MONTH,
  MONTHS,
  PRODUCT_CATEGORIES,
  REPAIR_CATEGORIES,
  STORE_LOCATIONS,
} from "../metrics/constants";
import { ProductMetricSchema } from "../metrics/product/model";
import type { BusinessMetric } from "../metrics/types";
import { createRandomBusinessMetrics } from "../metrics/utils";
import { type UserDocument, UserModel, type UserSchema } from "../user";
import type { AuthSchema } from "./model";

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
          userId: userDocument._id,
          username: userDocument.username,
          roles: userDocument.roles,
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

      // create random business metrics
      const businesMetrics = await createRandomBusinessMetrics({
        daysPerMonth: DAYS_PER_MONTH,
        months: MONTHS,
        productCategories: PRODUCT_CATEGORIES,
        repairCategories: REPAIR_CATEGORIES,
        storeLocations: STORE_LOCATIONS,
      });

      function createProductMetricsSchemas(
        businessMetrics: BusinessMetric[],
        userDocument: UserDocument,
      ) {
        const productMetricSchemaTemplate: ProductMetricSchema = {
          expireAt: new Date(Date.now() + 1000 * 60 * 60 * 12 * 1), // 12 hours
          name: "All Products",
          storeLocation: "All Locations",
          userId: userDocument._id,
          yearlyMetrics: [],
        };

        return businessMetrics.reduce((acc, curr) => {
          const { storeLocation, productMetrics } = curr;

          productMetrics.forEach((productMetric) => {
            const { name, yearlyMetrics } = productMetric;
            const productMetricSchema = {
              ...productMetricSchemaTemplate,
              name,
              storeLocation,
              yearlyMetrics,
            };

            acc.push(productMetricSchema);
          });

          return acc;
        }, [] as ProductMetricSchema[]);
      }

      const productMetricsSchemas = createProductMetricsSchemas(
        businesMetrics,
        userDocument,
      );

      console.log("productMetricsSchemas", productMetricsSchemas);

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

// @desc   Register user
// @route  POST /auth/register
// @access Public
function registerUserHandler<
  Doc extends DBRecord = DBRecord,
>(
  model: Model<Doc>,
) {
  return async (
    request: CreateNewResourceRequest<UserSchema>,
    response: Response,
  ) => {
    try {
      const { schema } = request.body;
      const { username, password } = schema;

      const getUserResult = await getResourceByFieldService({
        filter: { username },
        model,
      });

      if (getUserResult.err) {
        await createNewResourceService(
          createErrorLogSchema(getUserResult.val, request.body),
          ErrorLogModel,
        );

        response.status(200).json(
          createHttpResultError({
            message: "Unable to register. Please try again.",
          }),
        );
        return;
      }

      const unwrappedResult = getUserResult.safeUnwrap();

      if (unwrappedResult.kind === "success") {
        response.status(200).json(
          createHttpResultError({
            message: "Username already exists",
          }),
        );
        return;
      }

      const hashPasswordResult = await hashStringSafe({
        saltRounds: HASH_SALT_ROUNDS,
        stringToHash: password,
      });

      if (hashPasswordResult.err) {
        await createNewResourceService(
          createErrorLogSchema(hashPasswordResult.val, request.body),
          ErrorLogModel,
        );

        console.log("hashPasswordResult", hashPasswordResult);

        response.status(200).json(
          createHttpResultError({
            message: "Unable to register. Please try again.",
          }),
        );
        return;
      }

      const hashedPassword = hashPasswordResult.safeUnwrap().data;
      const userSchema = {
        ...schema,
        password: hashedPassword,
      };

      console.group("registerUserHandler");
      console.log("userSchema", userSchema);
      console.groupEnd();

      const createUserResult = await createNewResourceService(
        userSchema,
        model,
      );

      if (createUserResult.err) {
        await createNewResourceService(
          createErrorLogSchema(createUserResult.val, request.body),
          ErrorLogModel,
        );

        console.log("createUserResult", createUserResult);

        response.status(200).json(
          createHttpResultError({
            message: "Unable to register. Please try again.",
          }),
        );
        return;
      }

      response.status(200).json(
        createHttpResultSuccess({
          accessToken: "",
          message: "User registered successfully",
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

// @desc   Logout user
// @route  POST /auth/logout
// @access Private
function logoutUserHandler<
  Doc extends DBRecord = DBRecord,
>(
  model: Model<Doc>,
) {
  return async (
    request: RequestAfterJWTVerification,
    response: Response,
  ) => {
    try {
      const { accessToken } = request.body;

      if (!accessToken) {
        response.status(200).json(
          createHttpResultError({ triggerLogout: true }),
        );

        return;
      }

      const { ACCESS_TOKEN_SEED } = CONFIG;

      const verifyAccessTokenResult = await verifyJWTSafe({
        seed: ACCESS_TOKEN_SEED,
        token: accessToken,
      });

      if (verifyAccessTokenResult.err) {
        response.status(200).json(
          createHttpResultError({ triggerLogout: true }),
        );

        return;
      }

      const accessTokenDecodedResult = await decodeJWTSafe(accessToken);

      if (accessTokenDecodedResult.err) {
        response.status(200).json(
          createHttpResultError({ triggerLogout: true }),
        );

        return;
      }

      const accessTokenDecoded = accessTokenDecodedResult.safeUnwrap()
        .data as
          | DecodedToken
          | undefined;

      if (accessTokenDecoded === undefined) {
        response.status(200).json(
          createHttpResultError({ triggerLogout: true }),
        );

        return;
      }

      const sessionId = accessTokenDecoded.sessionId;

      const getAuthSessionResult = await getResourceByIdService(
        sessionId.toString(),
        model,
      );

      if (getAuthSessionResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            getAuthSessionResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        response.status(200).json(
          createHttpResultError({ triggerLogout: true }),
        );

        return;
      }

      const existingSession = getAuthSessionResult.safeUnwrap().data as
        | AuthSchema
        | undefined;

      if (existingSession === undefined) {
        response.status(200).json(
          createHttpResultError({ triggerLogout: true }),
        );

        return;
      }

      // check if token has already been invalidated

      if (!existingSession.isValid) {
        response.status(200).json(
          createHttpResultError({ triggerLogout: true }),
        );

        return;
      }

      // invalidate session
      const updateSessionResult = await updateResourceByIdService({
        fields: { isValid: false },
        model,
        resourceId: sessionId.toString(),
        updateOperator: "$set",
      });

      if (updateSessionResult.err) {
        await createNewResourceService(
          createErrorLogSchema(updateSessionResult.val, request.body),
          ErrorLogModel,
        );

        response.status(200).json(
          createHttpResultError({ triggerLogout: true }),
        );

        return;
      }

      response.status(200).json(
        createHttpResultSuccess({
          accessToken: "",
          triggerLogout: true,
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

      response.status(200).json(
        createHttpResultError({ triggerLogout: true }),
      );
    }
  };
}

export { loginUserHandler, logoutUserHandler, registerUserHandler };
