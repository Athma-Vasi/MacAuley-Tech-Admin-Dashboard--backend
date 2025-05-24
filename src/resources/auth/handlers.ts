import jwt from "jsonwebtoken";
import type { FilterQuery, Model } from "mongoose";
import { CONFIG } from "../../config";
import {
  ACCESS_TOKEN_EXPIRY,
  HASH_SALT_ROUNDS,
  PROPERTY_DESCRIPTOR,
} from "../../constants";
import {
  catchHandlerError,
  handleServiceErrorResult,
  handleServiceSuccessResult,
} from "../../handlers";
import {
  createNewResourceService,
  deleteResourceByIdService,
  getResourceByFieldService,
  updateResourceByIdService,
} from "../../services";
import type {
  HttpServerResponse,
  LoginUserRequest,
  RecordDB,
  RequestAfterFilesExtracting,
  RequestAfterJWTVerification,
  RequestAfterQueryParsing,
} from "../../types";
import {
  compareHashedStringWithPlainStringSafe,
  createSafeErrorResult,
  createSafeSuccessResult,
  decodeJWTSafe,
  hashStringSafe,
  verifyJWTSafe,
} from "../../utils";
import { FileUploadModel, type FileUploadSchema } from "../fileUpload/model";
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
  Doc extends RecordDB = RecordDB,
>(
  model: Model<Doc>,
) {
  return async (
    request: LoginUserRequest,
    response: HttpServerResponse<
      {
        userDocument: Omit<UserDocument, "password">;
        financialMetricsDocument: FinancialMetricsDocument;
      }
    >,
  ) => {
    try {
      const { schema } = request.body;
      const { username, password } = schema;

      const getUserResult = await getResourceByFieldService({
        filter: { username },
        model: UserModel,
      });
      if (getUserResult.err) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: getUserResult,
          status: 401,
        });
        return;
      }
      if (getUserResult.val.none) {
        handleServiceSuccessResult({
          request,
          response,
          safeSuccessResult: getUserResult,
        });
        return;
      }

      const userDocument = getUserResult.val.val;

      const isPasswordCorrectResult =
        await compareHashedStringWithPlainStringSafe({
          hashedString: userDocument.password,
          plainString: password,
        });
      if (isPasswordCorrectResult.err) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: isPasswordCorrectResult,
          status: 401,
        });
        return;
      }

      const { ACCESS_TOKEN_SEED } = CONFIG;

      // create auth session without token
      const authSessionSchema: AuthSchema = {
        addressIP: request.ip ?? "unknown",
        currentlyActiveToken: "notAToken",
        expireAt: new Date(AUTH_SESSION_EXPIRY), // 24 hours
        userAgent: request.get("User-Agent") ?? "unknown",
        userId: userDocument._id,
        username: userDocument.username,
      };

      const createAuthSessionResult = await createNewResourceService(
        authSessionSchema,
        model,
      );
      if (createAuthSessionResult.err) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: createAuthSessionResult,
          status: 401,
        });
        return;
      }
      if (createAuthSessionResult.val.none) {
        handleServiceSuccessResult({
          request,
          response,
          safeSuccessResult: createAuthSessionResult,
        });
        return;
      }

      const authSessionDocument = createAuthSessionResult.val.val;
      // create a new access token and use the session ID to sign the new token
      const accessToken = jwt.sign(
        {
          userId: userDocument._id.toString(),
          username: userDocument.username,
          roles: userDocument.roles,
          sessionId: authSessionDocument._id.toString(),
        },
        ACCESS_TOKEN_SEED,
        { expiresIn: ACCESS_TOKEN_EXPIRY },
      );

      // update the session with the new access token
      const updateSessionResult = await updateResourceByIdService({
        fields: {
          currentlyActiveToken: accessToken,
          ip: request.ip ?? "unknown",
          userAgent: request.headers["user-agent"] ?? "unknown",
        },
        model,
        resourceId: authSessionDocument._id
          .toString(),
        updateOperator: "$set",
      });
      if (updateSessionResult.err) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: updateSessionResult,
          status: 401,
        });
        return;
      }

      const userDocPartial = Object.entries(userDocument).reduce<
        Omit<UserDocument, "password">
      >(
        (userDocAcc, [key, value]) => {
          if (key === "password") {
            return userDocAcc;
          }

          Object.defineProperty(userDocAcc, key, {
            value,
            ...PROPERTY_DESCRIPTOR,
          });

          return userDocAcc;
        },
        Object.create(null),
      );

      const financialMetricsDocumentResult = await getResourceByFieldService({
        filter: { storeLocation: "All Locations" },
        model: FinancialMetricsModel,
      });
      if (financialMetricsDocumentResult.err) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: financialMetricsDocumentResult,
          status: 401,
        });
        return;
      }
      if (financialMetricsDocumentResult.val.none) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: createSafeErrorResult(
            "Unable to get financial metrics",
          ),
          status: 401,
        });
        return;
      }

      handleServiceSuccessResult({
        request,
        response,
        safeSuccessResult: createSafeSuccessResult({
          userDocument: userDocPartial,
          financialMetricsDocument: financialMetricsDocumentResult.val
            .val,
        }),
      });
    } catch (error: unknown) {
      await catchHandlerError({ error, request, response });
      return;
    }
  };
}

// @desc   Register user
// @route  POST /auth/register
// @access Public
function registerUserHandler<
  Doc extends RecordDB = RecordDB,
>(
  model: Model<Doc>,
) {
  return async (
    request: RequestAfterFilesExtracting<UserSchema>,
    response: HttpServerResponse<boolean>,
  ) => {
    try {
      const { schema, fileUploads } = request.body;
      const { username, password } = schema;

      const getUserResult = await getResourceByFieldService({
        filter: { username },
        model,
      });
      if (getUserResult.err) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: getUserResult,
          status: 401,
        });
        return;
      }
      if (getUserResult.val.some) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: createSafeErrorResult(
            "Username already exists",
          ),
          status: 401,
        });
        return;
      }

      const hashPasswordResult = await hashStringSafe({
        saltRounds: HASH_SALT_ROUNDS,
        stringToHash: password,
      });
      if (hashPasswordResult.err) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: hashPasswordResult,
          status: 401,
        });
        return;
      }

      if (hashPasswordResult.val.none) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: createSafeErrorResult(
            "Unable to hash password",
          ),
          status: 401,
        });
        return;
      }

      const userSchema = {
        ...schema,
        password: hashPasswordResult.val.val,
      };

      const createUserResult = await createNewResourceService(
        userSchema,
        model,
      );
      if (createUserResult.err) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: createUserResult,
          status: 401,
        });
        return;
      }

      if (createUserResult.val.none) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: createSafeErrorResult(
            "Unable to create user",
          ),
          status: 401,
        });
        return;
      }

      const userDocument = createUserResult.val.val;

      const fileUploadSchema: FileUploadSchema = {
        ...fileUploads[0],
        associatedDocumentId: userDocument._id,
        userId: userDocument._id,
        username: userDocument.username,
      };

      const createFileUploadResult = await createNewResourceService(
        fileUploadSchema,
        FileUploadModel,
      );
      if (createFileUploadResult.err) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: createFileUploadResult,
          status: 401,
        });
        return;
      }

      if (createFileUploadResult.val.none) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: createSafeErrorResult(
            "Unable to create file upload",
          ),
          status: 401,
        });
        return;
      }

      const fileUploadDocument = createFileUploadResult.val.val;

      const updateUserResult = await updateResourceByIdService({
        fields: {
          fileUploadId: fileUploadDocument._id,
        },
        model: UserModel,
        resourceId: userDocument._id.toString(),
        updateOperator: "$set",
      });
      if (updateUserResult.err) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: updateUserResult,
          status: 401,
        });
        return;
      }

      if (updateUserResult.val.none) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: createSafeErrorResult(
            "Unable to update user",
          ),
          status: 401,
        });
        return;
      }

      const updatedUserDocument = updateUserResult.val.val;

      const updateFileUploadResult = await updateResourceByIdService({
        fields: {
          associatedDocumentId: updatedUserDocument._id,
        },
        model: FileUploadModel,
        resourceId: fileUploadDocument._id.toString(),
        updateOperator: "$set",
      });
      if (updateFileUploadResult.err) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: updateFileUploadResult,
          status: 401,
        });
        return;
      }

      if (updateFileUploadResult.val.none) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: createSafeErrorResult(
            "Unable to update file upload",
          ),
          status: 401,
        });
        return;
      }

      handleServiceSuccessResult({
        request,
        response,
        safeSuccessResult: createSafeSuccessResult(true),
      });
      return;
    } catch (error: unknown) {
      await catchHandlerError({ error, request, response });
      return;
    }
  };
}

// @desc   Logout user
// @route  POST /auth/logout
// @access Private
function logoutUserHandler<
  Doc extends RecordDB = RecordDB,
>(
  model: Model<Doc>,
) {
  return async (
    request: RequestAfterJWTVerification,
    response: HttpServerResponse<boolean>,
  ) => {
    try {
      const { accessToken } = request.body;

      if (!accessToken) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: createSafeErrorResult(
            "Access token is required",
          ),
          status: 401,
        });
        return;
      }

      const { ACCESS_TOKEN_SEED } = CONFIG;

      const verifyAccessTokenResult = await verifyJWTSafe({
        seed: ACCESS_TOKEN_SEED,
        token: accessToken,
      });
      if (verifyAccessTokenResult.err) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: verifyAccessTokenResult,
          status: 401,
        });
        return;
      }

      const accessTokenDecodedResult = await decodeJWTSafe(accessToken);
      if (accessTokenDecodedResult.err) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: accessTokenDecodedResult,
          status: 401,
        });
        return;
      }
      if (accessTokenDecodedResult.val.none) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: createSafeErrorResult(
            "Unable to decode access token",
          ),
          status: 401,
        });
        return;
      }

      const accessTokenDecoded = accessTokenDecodedResult.val.val;
      const sessionId = accessTokenDecoded.sessionId;
      const deleteSessionResult = await deleteResourceByIdService(
        sessionId.toString(),
        model,
      );
      if (deleteSessionResult.err) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: deleteSessionResult,
          status: 401,
        });
        return;
      }

      handleServiceSuccessResult({
        request,
        response,
        safeSuccessResult: createSafeSuccessResult(true),
      });
      return;
    } catch (error: unknown) {
      await catchHandlerError({ error, request, response });
      return;
    }
  };
}

// @desc   Check if email or username exists
// @route  GET /auth/check
// @access Public
function checkUsernameOrEmailExistsHandler<
  Doc extends RecordDB = RecordDB,
>(model: Model<Doc>) {
  return async (
    request: RequestAfterQueryParsing,
    response: HttpServerResponse<boolean>,
  ) => {
    try {
      const { filter } = request.query;
      const isUsernameOrEmailExistsResult = await getResourceByFieldService({
        filter: filter as FilterQuery<Doc>,
        model,
      });
      if (isUsernameOrEmailExistsResult.err) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: isUsernameOrEmailExistsResult,
          status: 401,
        });
        return;
      }

      // username or email exists
      if (isUsernameOrEmailExistsResult.val.some) {
        await handleServiceErrorResult({
          request,
          response,
          safeErrorResult: createSafeErrorResult(true),
        });
        return;
      }

      // username or email does not exist
      handleServiceSuccessResult({
        request,
        response,
        safeSuccessResult: createSafeSuccessResult(false),
      });
      return;
    } catch (error: unknown) {
      await catchHandlerError({ error, request, response });
      return;
    }
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
