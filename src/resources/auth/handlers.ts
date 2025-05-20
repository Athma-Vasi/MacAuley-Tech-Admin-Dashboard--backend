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
  DBRecord,
  HttpResult,
  LoginUserRequest,
  RequestAfterFilesExtracting,
  RequestAfterJWTVerification,
  RequestAfterQueryParsing,
} from "../../types";
import {
  compareHashedStringWithPlainStringSafe,
  createErrorLogSchema,
  createHttpResponseError,
  createHttpResponseSuccess,
  decodeJWTSafe,
  hashStringSafe,
  verifyJWTSafe,
} from "../../utils";
import { ErrorLogModel } from "../errorLog";
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
          createHttpResponseError({
            message: "Unable to get user. Please try again!",
          }),
        );
        return;
      }

      if (getUserResult.val.kind === "notFound") {
        console.log(`Username ${username} not found`);
        response.status(200).json(
          createHttpResponseSuccess({
            accessToken: "",
            data: [],
            message: "Invalid credentials",
          }),
        );
        return;
      }

      const [userDocument] = getUserResult.safeUnwrap().data;

      if (userDocument === undefined || userDocument === null) {
        response.status(200).json(
          createHttpResponseError({
            status: 404,
            message: "Invalid credentials",
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
          // for security
          createHttpResponseSuccess({
            accessToken: "",
            data: [],
            message: "Invalid credentials",
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
          createHttpResponseError({
            message: "Unable to create session. Please try again!",
          }),
        );
        return;
      }

      const createAuthSessionUnwrapped = createAuthSessionResult.safeUnwrap()
        ?.data;

      if (createAuthSessionUnwrapped.length === 0) {
        response.status(200).json(
          createHttpResponseError({
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
          createHttpResponseError({
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
          createHttpResponseError({
            message: "Unable to get financial metrics document",
          }),
        );
        return;
      }

      const financialMetricsDocumentUnwrapped = financialMetricsDocumentResult
        .safeUnwrap().data;

      if (financialMetricsDocumentUnwrapped.length === 0) {
        response.status(200).json(
          createHttpResponseError({
            message: "Unable to get financial metrics document",
          }),
        );
        return;
      }

      const [financialMetricsDocument] = financialMetricsDocumentUnwrapped;

      response.status(200).json(
        createHttpResponseSuccess({
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

      response.status(200).json(createHttpResponseError({}));
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
    request: RequestAfterFilesExtracting<UserSchema>,
    response: Response,
  ) => {
    try {
      const { schema, fileUploads } = request.body;
      const { username, password } = schema;

      console.log("\n");
      console.group("registerUserHandler");
      console.log({ fileUploads });
      console.log({ schema });
      console.groupEnd();

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
          createHttpResponseError({
            message: "Unable to register. Please try again.",
          }),
        );
        return;
      }

      const unwrappedResult = getUserResult.safeUnwrap();

      if (unwrappedResult.kind === "success") {
        response.status(200).json(
          createHttpResponseError({
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

        response.status(200).json(
          createHttpResponseError({
            message: "Unable to hash password. Please try again.",
          }),
        );
        return;
      }

      const hashedPasswordUnwrapped = hashPasswordResult.safeUnwrap().data;

      if (hashedPasswordUnwrapped.length === 0) {
        response.status(200).json(
          createHttpResponseError({
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

      const createUserResult = await createNewResourceService(
        userSchema,
        model,
      );

      if (createUserResult.err) {
        await createNewResourceService(
          createErrorLogSchema(createUserResult.val, request.body),
          ErrorLogModel,
        );

        response.status(200).json(
          createHttpResponseError({
            message: "Unable to create user. Please try again.",
          }),
        );
        return;
      }

      const createUserUnwrapped = createUserResult.safeUnwrap().data;
      if (createUserUnwrapped.length === 0) {
        response.status(200).json(
          createHttpResponseError({
            message: "Unable to retrieve user. Please try again.",
          }),
        );
        return;
      }
      const [userDocument] = createUserUnwrapped;

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
        await createNewResourceService(
          createErrorLogSchema(
            createFileUploadResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        response.status(200).json(
          createHttpResponseError({
            message: "Unable to upload file. Please try again.",
          }),
        );
        return;
      }

      const createFileUploadUnwrapped = createFileUploadResult.safeUnwrap()
        .data;
      const [fileUploadDocument] = createFileUploadUnwrapped;
      if (fileUploadDocument === undefined) {
        response.status(200).json(
          createHttpResponseError({
            message: "Unable to retrieve file upload document.",
          }),
        );
        return;
      }
      console.log({ fileUploadDocument });

      const updateUserResult = await updateResourceByIdService({
        fields: {
          fileUploadId: fileUploadDocument._id,
        },
        model: UserModel,
        resourceId: userDocument._id.toString(),
        updateOperator: "$set",
      });
      if (updateUserResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            updateUserResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        response.status(200).json(
          createHttpResponseError({
            message:
              "Unable to update user with file upload id. Please try again.",
          }),
        );
        return;
      }

      const updateUserUnwrapped = updateUserResult.safeUnwrap().data;
      const [updatedUserDocument] = updateUserUnwrapped;
      if (updatedUserDocument === undefined) {
        response.status(200).json(
          createHttpResponseError({
            message: "Unable to retrieve updated user document.",
          }),
        );
        return;
      }
      console.log({ updatedUserDocument });

      const updateFileUploadResult = await updateResourceByIdService({
        fields: {
          associatedDocumentId: updatedUserDocument._id,
        },
        model: FileUploadModel,
        resourceId: fileUploadDocument._id.toString(),
        updateOperator: "$set",
      });
      if (updateFileUploadResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            updateFileUploadResult.val,
            request.body,
          ),
          ErrorLogModel,
        );
        response.status(200).json(
          createHttpResponseError({
            message:
              "Unable to update file upload with associated document id. Please try again.",
          }),
        );
        return;
      }
      const updateFileUploadUnwrapped =
        updateFileUploadResult.safeUnwrap().data;
      const [updatedFileUploadDocument] = updateFileUploadUnwrapped;
      if (updatedFileUploadDocument === undefined) {
        response.status(200).json(
          createHttpResponseError({
            message: "Unable to retrieve updated file upload document.",
          }),
        );
        return;
      }
      console.log({ updatedFileUploadDocument });

      response.status(200).json(
        createHttpResponseSuccess({
          accessToken: "",
          data: [true],
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

      response.status(200).json(createHttpResponseError({}));
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
          createHttpResponseError({ triggerLogout: true }),
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
          createHttpResponseError({ triggerLogout: true }),
        );

        return;
      }

      const accessTokenDecodedResult = await decodeJWTSafe(accessToken);

      if (accessTokenDecodedResult.err) {
        response.status(200).json(
          createHttpResponseError({ triggerLogout: true }),
        );

        return;
      }

      const accessTokenDecodedUnwrapped = accessTokenDecodedResult.safeUnwrap()
        .data;

      if (accessTokenDecodedUnwrapped.length === 0) {
        response.status(200).json(
          createHttpResponseError({ triggerLogout: true }),
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
          createHttpResponseError({ triggerLogout: true }),
        );

        return;
      }

      response.status(200).json(
        createHttpResponseSuccess({
          accessToken: "",
          data: [true],
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
        createHttpResponseError({ triggerLogout: true }),
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
        createHttpResponseError({
          message: "Unable to check existence of username",
        }),
      );
      return;
    }

    // username or email exists
    if (isUsernameOrEmailExistsResult.val.kind === "success") {
      response.status(200).json(
        createHttpResponseSuccess({ data: [true], accessToken: "" }),
      );
      return;
    }

    // username or email does not exist
    response.status(200).json(
      createHttpResponseSuccess({ data: [false], accessToken: "" }),
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
