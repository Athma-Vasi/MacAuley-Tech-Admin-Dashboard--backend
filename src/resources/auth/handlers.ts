import type { Response } from "express";
import jwt from "jsonwebtoken";
import type { Model } from "mongoose";
import { CONFIG } from "../../config";
import { ACCESS_TOKEN_EXPIRY, HASH_SALT_ROUNDS } from "../../constants";
import {
  createNewResourceService,
  deleteResourceByIdService,
  getResourceByFieldService,
  updateResourceByIdService,
} from "../../services";
import type {
  CreateNewResourceRequest,
  DBRecord,
  HttpResult,
  LoginUserRequest,
  RequestAfterJWTVerification,
  RequestAfterQueryParsing,
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
  type FinancialMetricsDocument,
  FinancialMetricsModel,
} from "../metrics/financial/model";
import { type UserDocument, UserModel, type UserSchema } from "../user";
import { AUTH_SESSION_EXPIRY } from "./constants";
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
      HttpResult<
        {
          userDocument: UserDocument;
          financialMetricsDocument: FinancialMetricsDocument;
        }
      >
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

      const [userDocument] = getUserResult.safeUnwrap().data;

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

      // create auth session without token
      const authSessionSchema: AuthSchema = {
        addressIP: request.ip ?? "unknown",
        currentlyActiveToken: "notAToken",
        expireAt: new Date(AUTH_SESSION_EXPIRY), // 3 hour
        userAgent: request.get("User-Agent") ?? "unknown",
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

      const createAuthSessionUnwrapped = createAuthSessionResult.safeUnwrap()
        ?.data;

      if (createAuthSessionUnwrapped.length === 0) {
        response.status(200).json(
          createHttpResultError({
            message: "Unable to create session. Please try again!",
          }),
        );
        return;
      }

      const [authSession] = createAuthSessionUnwrapped;

      // create a new access token and use the session ID to sign the new token
      const accessToken = jwt.sign(
        {
          userId: userDocument._id,
          username: userDocument.username,
          roles: userDocument.roles,
          sessionId: authSession._id,
        },
        ACCESS_TOKEN_SEED,
        { expiresIn: ACCESS_TOKEN_EXPIRY },
      );

      // update the session with the new access token
      const updateSessionResult = await updateResourceByIdService({
        fields: {
          currentlyActiveToken: accessToken,
          addressIP: request.ip ?? "unknown",
          userAgent: request.headers["user-agent"] ?? "unknown",
        },
        model,
        resourceId: authSession._id.toString(),
        updateOperator: "$set",
      });

      if (updateSessionResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            updateSessionResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        response.status(200).json(
          createHttpResultError({
            message:
              "Unable to update session's access token. Please try again!",
          }),
        );
        return;
      }

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

      const financialMetricsDocumentResult = await getResourceByFieldService({
        filter: { storeLocation: "All Locations" },
        model: FinancialMetricsModel,
      });

      if (financialMetricsDocumentResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            financialMetricsDocumentResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        response.status(200).json(
          createHttpResultError({
            message: "Unable to get financial metrics document",
          }),
        );
        return;
      }

      const financialMetricsDocumentUnwrapped = financialMetricsDocumentResult
        .safeUnwrap().data;

      if (financialMetricsDocumentUnwrapped.length === 0) {
        response.status(200).json(
          createHttpResultError({
            message: "Unable to get financial metrics document",
          }),
        );
        return;
      }

      const [financialMetricsDocument] = financialMetricsDocumentUnwrapped;

      console.group("loginUserHandler");
      console.log("userDocument", userDocument);
      console.log("financialMetricsDocument", financialMetricsDocument);
      console.log("accessToken", accessToken);
      console.log("authSession", authSession);
      console.groupEnd();

      response.status(200).json(
        createHttpResultSuccess({
          accessToken,
          data: [{
            userDocument: userDocPartial,
            financialMetricsDocument,
          }],
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
      const { username, password, email } = schema;

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
            message: "Unable to hash password. Please try again.",
          }),
        );
        return;
      }

      const hashedPasswordUnwrapped = hashPasswordResult.safeUnwrap().data;

      if (hashedPasswordUnwrapped.length === 0) {
        response.status(200).json(
          createHttpResultError({
            message: "Unable to retrieve hashed password. Please try again.",
          }),
        );
        return;
      }

      const [hashedPassword] = hashedPasswordUnwrapped;
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
            message: "Unable to create user. Please try again.",
          }),
        );
        return;
      }

      response.status(200).json(
        createHttpResultSuccess({
          accessToken: "",
          data: [],
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

      const accessTokenDecodedUnwrapped = accessTokenDecodedResult.safeUnwrap()
        .data;

      if (accessTokenDecodedUnwrapped.length === 0) {
        response.status(200).json(
          createHttpResultError({ triggerLogout: true }),
        );

        return;
      }

      const [accessTokenDecoded] = accessTokenDecodedUnwrapped;
      const sessionId = accessTokenDecoded.sessionId;

      const deleteSessionResult = await deleteResourceByIdService(
        sessionId.toString(),
        model,
      );

      if (deleteSessionResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            deleteSessionResult.val,
            request.body,
          ),
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
          data: [],
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

// @desc   Check if email or username exists
// @route  GET /auth/check
// @access Public
function checkUsernameOrEmailExistsHandler<
  Doc extends DBRecord = DBRecord,
>(model: Model<Doc>) {
  return async (
    request: RequestAfterQueryParsing,
    response: Response<HttpResult<boolean>>,
  ) => {
    const { filter } = request.query;

    console.log("filter in checkUsernameOrEmailExistsHandler", filter);

    const isUsernameOrEmailExistsResult = await getResourceByFieldService({
      filter: filter as any,
      model,
    });

    if (isUsernameOrEmailExistsResult.err) {
      await createNewResourceService(
        createErrorLogSchema(
          isUsernameOrEmailExistsResult.val,
          request.body,
        ),
        ErrorLogModel,
      );

      response.status(200).json(
        createHttpResultError({
          message: "Unable to check existence of username",
        }),
      );
      return;
    }

    console.log(
      "isUsernameOrEmailExistsResult",
      isUsernameOrEmailExistsResult.safeUnwrap(),
    );

    // username or email exists
    if (isUsernameOrEmailExistsResult.val.kind === "success") {
      response.status(200).json(
        createHttpResultSuccess({ data: [true], accessToken: "" }),
      );
      return;
    }

    // username or email does not exist
    response.status(200).json(
      createHttpResultSuccess({ data: [false], accessToken: "" }),
    );
    return;
  };
}

export {
  checkUsernameOrEmailExistsHandler,
  loginUserHandler,
  logoutUserHandler,
  registerUserHandler,
};

// create random business metrics
// const businessMetrics = await createRandomBusinessMetrics({
//   daysPerMonth: DAYS_PER_MONTH,
//   months: MONTHS,
//   productCategories: PRODUCT_CATEGORIES,
//   repairCategories: REPAIR_CATEGORIES,
//   storeLocations: STORE_LOCATIONS,
// });

// function createProductMetricsSchemas(
//   businessMetrics: BusinessMetric[],
// ) {
//   const productMetricsSchemaTemplate: ProductMetricsSchema = {
//     storeLocation: "All Locations",
//     metricCategory: "All Products",
//     yearlyMetrics: [],
//   };

//   return businessMetrics.reduce((acc, curr) => {
//     const { storeLocation, productMetrics } = curr;

//     productMetrics.forEach((productMetric) => {
//       const { name, yearlyMetrics } = productMetric;

//       const productMetricsSchema = {
//         ...productMetricsSchemaTemplate,
//         storeLocation,
//         metricCategory: name,
//         yearlyMetrics,
//       };

//       acc.push(productMetricsSchema);
//     });

//     return acc;
//   }, [] as ProductMetricsSchema[]);
// }

// const productMetricsSchemas = createProductMetricsSchemas(
//   businessMetrics,
// );

// function createRepairMetricsSchemas(businessMetrics: BusinessMetric[]) {
//   const repairMetricsSchemaTemplate: RepairMetricsSchema = {
//     storeLocation: "All Locations",
//     metricCategory: "All Repairs",
//     yearlyMetrics: [],
//   };

//   return businessMetrics.reduce((acc, curr) => {
//     const { storeLocation, repairMetrics } = curr;

//     repairMetrics.forEach((repairMetric) => {
//       const { name, yearlyMetrics } = repairMetric;

//       const repairMetricsSchema = {
//         ...repairMetricsSchemaTemplate,
//         storeLocation,
//         metricCategory: name,
//         yearlyMetrics,
//       };

//       acc.push(repairMetricsSchema);
//     });

//     return acc;
//   }, [] as RepairMetricsSchema[]);
// }

// const repairMetricsSchemas = createRepairMetricsSchemas(
//   businessMetrics,
// );

// function createFinancialMetricsSchemas(
//   businessMetrics: BusinessMetric[],
// ) {
//   const financialMetricsSchemaTemplate: FinancialMetricsSchema = {
//     storeLocation: "All Locations",
//     financialMetrics: [],
//   };

//   return businessMetrics.reduce((acc, curr) => {
//     const { storeLocation, financialMetrics } = curr;

//     const financialMetricsSchema = {
//       ...financialMetricsSchemaTemplate,
//       storeLocation,
//       financialMetrics,
//     };

//     acc.push(financialMetricsSchema);

//     return acc;
//   }, [] as FinancialMetricsSchema[]);
// }

// const financialMetricsSchemas = createFinancialMetricsSchemas(
//   businessMetrics,
// );

// function createCustomerMetricsSchemas(businessMetric: BusinessMetric[]) {
//   const customerMetricsSchemaTemplate: CustomerMetricsSchema = {
//     storeLocation: "All Locations",
//     customerMetrics: {} as CustomerMetrics,
//   };

//   return businessMetric.reduce((acc, curr) => {
//     const { storeLocation, customerMetrics } = curr;

//     const customerMetricsSchema = {
//       ...customerMetricsSchemaTemplate,
//       storeLocation,
//       customerMetrics,
//     };
//     acc.push(customerMetricsSchema);

//     return acc;
//   }, [] as CustomerMetricsSchema[]);
// }

// const customerMetricsSchemas = createCustomerMetricsSchemas(
//   businessMetrics,
// );

// console.time("customerMetricsDocument");

// const customerMetricsDocument = await Promise.all(
//   customerMetricsSchemas.map(
//     async (customerMetricsSchema) =>
//       await createNewResourceService(
//         customerMetricsSchema,
//         CustomerMetricsModel,
//       ),
//   ),
// );

// console.log("customerMetricsDocument", customerMetricsDocument);

// console.timeEnd("customerMetricsDocument");
