import type { FilterQuery, Model } from "mongoose";
import { Ok, Some } from "ts-results";
import { CONFIG } from "../../config";
import {
  ACCESS_TOKEN_EXPIRY,
  HASH_SALT_ROUNDS,
  INVALID_CREDENTIALS,
  PROPERTY_DESCRIPTOR,
} from "../../constants";
import {
  catchHandlerError,
  handleErrorResult,
  handleNoneOption,
  handleSuccessResult,
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
  createSafeSuccessResult,
  decodeJWTSafe,
  hashStringSafe,
  signJWTSafe,
  verifyJWTSafe,
} from "../../utils";
import { FileUploadModel, type FileUploadSchema } from "../fileUpload/model";
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
      Omit<UserDocument, "password">
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
        await handleErrorResult({
          request,
          response,
          safeErrorResult: getUserResult,
          status: 401,
        });
        return;
      }
      if (getUserResult.val.none) {
        handleNoneOption({
          message: INVALID_CREDENTIALS,
          request,
          response,
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
        await handleErrorResult({
          request,
          response,
          safeErrorResult: isPasswordCorrectResult,
          status: 401,
        });
        return;
      }
      if (isPasswordCorrectResult.val.none) {
        handleNoneOption({
          message: INVALID_CREDENTIALS,
          request,
          response,
        });
        return;
      }
      // TODO: Uncomment for production
      // if (!isPasswordCorrectResult.val.val) {
      //   await handleErrorResult({
      //     request,
      //     response,
      //     safeErrorResult: createSafeErrorResult(INVALID_CREDENTIALS),
      //   });
      //   return;
      // }

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
        await handleErrorResult({
          request,
          response,
          safeErrorResult: createAuthSessionResult,
        });
        return;
      }
      if (createAuthSessionResult.val.none) {
        handleNoneOption({
          message: "Unable to create auth session",
          request,
          response,
        });
        return;
      }

      const authSessionDocument = createAuthSessionResult.val.val;
      // create a new access token and use the session ID to sign the new token
      const accessTokenResult = signJWTSafe({
        payload: {
          userId: userDocument._id.toString(),
          username: userDocument.username,
          roles: userDocument.roles,
          sessionId: authSessionDocument._id.toString(),
        },
        secretOrPrivateKey: ACCESS_TOKEN_SEED,
        options: {
          expiresIn: ACCESS_TOKEN_EXPIRY,
        },
      });
      if (accessTokenResult.err) {
        await handleErrorResult({
          request,
          response,
          safeErrorResult: accessTokenResult,
        });
        return;
      }
      if (accessTokenResult.val.none) {
        handleNoneOption({
          message: "Unable to create access token",
          request,
          response,
        });
        return;
      }

      // update the session with the new access token
      const updateSessionResult = await updateResourceByIdService({
        fields: {
          currentlyActiveToken: accessTokenResult.val.val,
          ip: request.ip ?? "unknown",
          userAgent: request.headers["user-agent"] ?? "unknown",
        },
        model,
        resourceId: authSessionDocument._id
          .toString(),
        updateOperator: "$set",
      });
      if (updateSessionResult.err) {
        await handleErrorResult({
          request,
          response,
          safeErrorResult: updateSessionResult,
        });
        return;
      }
      if (updateSessionResult.val.none) {
        handleNoneOption({
          message: "Unable to update auth session",
          request,
          response,
        });
        return;
      }

      // add token to request body to be sent back to client
      Object.defineProperty(request.body, "accessToken", {
        value: accessTokenResult.val.val,
        ...PROPERTY_DESCRIPTOR,
      });

      const userDocWithoutPassword = Object.entries(userDocument).reduce<
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

      handleSuccessResult({
        request,
        response,
        safeSuccessResult: createSafeSuccessResult(userDocWithoutPassword),
      });
      return;
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
        await handleErrorResult({
          request,
          response,
          safeErrorResult: getUserResult,
          status: 401,
        });
        return;
      }
      if (getUserResult.val.some) {
        handleSuccessResult({
          request,
          response,
          safeSuccessResult: new Ok(Some(false)),
        });
        return;
      }

      const hashPasswordResult = await hashStringSafe({
        saltRounds: HASH_SALT_ROUNDS,
        stringToHash: password,
      });
      if (hashPasswordResult.err) {
        await handleErrorResult({
          request,
          response,
          safeErrorResult: hashPasswordResult,
          status: 401,
        });
        return;
      }
      if (hashPasswordResult.val.none) {
        handleNoneOption({
          message: "Unable to hash password",
          request,
          response,
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
        await handleErrorResult({
          request,
          response,
          safeErrorResult: createUserResult,
          status: 401,
        });
        return;
      }
      if (createUserResult.val.none) {
        handleNoneOption({
          message: "Unable to create user",
          request,
          response,
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
        await handleErrorResult({
          request,
          response,
          safeErrorResult: createFileUploadResult,
        });
        return;
      }
      if (createFileUploadResult.val.none) {
        handleNoneOption({
          message: "Unable to create file upload",
          request,
          response,
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
        await handleErrorResult({
          request,
          response,
          safeErrorResult: updateUserResult,
        });
        return;
      }
      if (updateUserResult.val.none) {
        handleNoneOption({
          message: "Unable to update user with file upload ID",
          request,
          response,
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
        await handleErrorResult({
          request,
          response,
          safeErrorResult: updateFileUploadResult,
        });
        return;
      }
      if (updateFileUploadResult.val.none) {
        handleNoneOption({
          message: "Unable to update file upload with user ID",
          request,
          response,
        });
        return;
      }

      handleSuccessResult({
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
      const { ACCESS_TOKEN_SEED } = CONFIG;

      const verifyAccessTokenResult = await verifyJWTSafe({
        seed: ACCESS_TOKEN_SEED,
        token: accessToken,
      });
      if (verifyAccessTokenResult.err) {
        await handleErrorResult({
          request,
          response,
          safeErrorResult: verifyAccessTokenResult,
        });
        return;
      }
      if (verifyAccessTokenResult.val.none) {
        handleNoneOption({
          message: "Unable to verify access token",
          request,
          response,
        });
        return;
      }

      const accessTokenDecodedResult = await decodeJWTSafe(accessToken);
      if (accessTokenDecodedResult.err) {
        await handleErrorResult({
          request,
          response,
          safeErrorResult: accessTokenDecodedResult,
        });
        return;
      }
      if (accessTokenDecodedResult.val.none) {
        handleNoneOption({
          message: "Unable to decode access token",
          request,
          response,
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
        await handleErrorResult({
          request,
          response,
          safeErrorResult: deleteSessionResult,
          status: 401,
        });
        return;
      }
      if (deleteSessionResult.val.none) {
        handleNoneOption({
          message: "Unable to delete auth session",
          request,
          response,
        });
        return;
      }

      handleSuccessResult({
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
        await handleErrorResult({
          request,
          response,
          safeErrorResult: isUsernameOrEmailExistsResult,
          status: 401,
        });
        return;
      }

      // username or email does not exist
      if (isUsernameOrEmailExistsResult.val.none) {
        handleSuccessResult({
          request,
          response,
          safeSuccessResult: createSafeSuccessResult(false),
        });
        return;
      }

      // username or email exists
      handleSuccessResult({
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
