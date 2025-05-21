import jwt from "jsonwebtoken";
import type { FilterQuery, Model } from "mongoose";
import { None, Some } from "ts-results";
import { CONFIG } from "../../config";
import {
  ACCESS_TOKEN_EXPIRY,
  HASH_SALT_ROUNDS,
  PROPERTY_DESCRIPTOR,
} from "../../constants";
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
        await createNewResourceService(
          createErrorLogSchema(getUserResult.val, request.body),
          ErrorLogModel,
        );

        response.status(200).json(
          createHttpResponseError({
            error: getUserResult.val.data,
            request,
            status: 401,
          }),
        );
        return;
      }

      if (getUserResult.val.data.none) {
        response.status(200).json(
          createHttpResponseError({
            error: Some("Invalid credentials"),
            request,
            kind: "success",
          }),
        );
        return;
      }

      const isPasswordCorrectResult =
        await compareHashedStringWithPlainStringSafe({
          hashedString: getUserResult.val.data.safeUnwrap().password,
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
          createHttpResponseError({
            error: Some("Invalid credentials"),
            request,
            kind: "success",
          }),
        );
        return;
      }

      const { ACCESS_TOKEN_SEED } = CONFIG;
      const userDocument = getUserResult.val.data.safeUnwrap();

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
        await createNewResourceService(
          createErrorLogSchema(
            createAuthSessionResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        response.status(200).json(
          createHttpResponseError({
            error: createAuthSessionResult.val.data,
            request,
            status: 401,
          }),
        );
        return;
      }

      if (createAuthSessionResult.val.data.none) {
        response.status(200).json(
          createHttpResponseError({
            error: Some("Invalid credentials"),
            request,
            kind: "success",
          }),
        );
        return;
      }

      // create a new access token and use the session ID to sign the new token
      const accessToken = jwt.sign(
        {
          userId: userDocument._id,
          username: userDocument.username,
          roles: userDocument.roles,
          sessionId: createAuthSessionResult.val.data.safeUnwrap()._id,
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
        resourceId: createAuthSessionResult.val.data.safeUnwrap()._id
          .toString(),
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
            error: updateSessionResult.val.data,
            request,
            status: 401,
          }),
        );
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
        await createNewResourceService(
          createErrorLogSchema(
            financialMetricsDocumentResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        response.status(200).json(
          createHttpResponseError({
            error: financialMetricsDocumentResult.val.data,
            request,
            status: 401,
          }),
        );
        return;
      }

      if (financialMetricsDocumentResult.val.data.none) {
        response.status(200).json(
          createHttpResponseError({
            error: Some("Unable to get financial metrics"),
            request,
            status: 401,
          }),
        );
        return;
      }

      response.status(200).json(
        createHttpResponseSuccess({
          accessToken: Some(accessToken),
          data: Some({
            userDocument: userDocPartial,
            financialMetricsDocument: financialMetricsDocumentResult.val
              .data
              .safeUnwrap(),
          }),
        }),
      );
    } catch (error: unknown) {
      await createNewResourceService(
        createErrorLogSchema(
          { data: Some(error), message: Some("Error logging in user") },
          request.body,
        ),
        ErrorLogModel,
      );

      response.status(200).json(
        createHttpResponseError({ error: Some(error), request }),
      );
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
            error: getUserResult.val.data,
            request,
            status: 401,
          }),
        );
        return;
      }

      if (getUserResult.val.data.some) {
        response.status(200).json(
          createHttpResponseError({
            error: Some("Username already exists"),
            request,
            status: 401,
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
            error: hashPasswordResult.val.data,
            request,
            status: 401,
          }),
        );
        return;
      }

      if (hashPasswordResult.val.data.none) {
        response.status(200).json(
          createHttpResponseError({
            error: Some("Unable to hash password"),
            request,
            status: 401,
          }),
        );
        return;
      }

      const userSchema = {
        ...schema,
        password: hashPasswordResult.val.data.safeUnwrap(),
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
            error: createUserResult.val.data,
            request,
            status: 401,
          }),
        );
        return;
      }

      if (createUserResult.val.data.none) {
        response.status(200).json(
          createHttpResponseError({
            error: Some("Unable to create user"),
            request,
            status: 401,
          }),
        );
        return;
      }

      const userDocument = createUserResult.val.data.safeUnwrap();

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
            error: createFileUploadResult.val.data,
            request,
            status: 401,
          }),
        );
        return;
      }

      if (createFileUploadResult.val.data.none) {
        response.status(200).json(
          createHttpResponseError({
            error: Some("Unable to create file upload"),
            request,
            status: 401,
          }),
        );
        return;
      }

      const fileUploadDocument = createFileUploadResult.val.data.safeUnwrap();

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
            error: updateUserResult.val.data,
            request,
            status: 401,
          }),
        );
        return;
      }

      if (updateUserResult.val.data.none) {
        response.status(200).json(
          createHttpResponseError({
            error: Some("Unable to update user"),
            request,
            status: 401,
          }),
        );
        return;
      }

      const updatedUserDocument = updateUserResult.val.data.safeUnwrap();

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
            error: updateFileUploadResult.val.data,
            request,
            status: 401,
          }),
        );
        return;
      }

      if (updateFileUploadResult.val.data.none) {
        response.status(200).json(
          createHttpResponseError({
            error: Some("Unable to update file upload"),
            request,
            status: 401,
          }),
        );
        return;
      }

      response.status(200).json(
        createHttpResponseSuccess({
          accessToken: None,
          data: Some(true),
          message: "User registered successfully",
        }),
      );
    } catch (error: unknown) {
      await createNewResourceService(
        createErrorLogSchema(
          { data: Some(error), message: Some("Error registering user") },
          request.body,
        ),
        ErrorLogModel,
      );

      response.status(200).json(createHttpResponseError({
        error: Some(error),
        request,
        status: 401,
      }));
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
        response.status(200).json(
          createHttpResponseError({
            error: Some("Access token is required"),
            request,
            status: 401,
            triggerLogout: true,
          }),
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
          createHttpResponseError({
            error: verifyAccessTokenResult.val.data,
            request,
            status: 401,
            triggerLogout: true,
          }),
        );

        return;
      }

      const accessTokenDecodedResult = await decodeJWTSafe(accessToken);

      if (accessTokenDecodedResult.err) {
        response.status(200).json(
          createHttpResponseError({
            error: accessTokenDecodedResult.val.data,
            request,
            status: 401,
            triggerLogout: true,
          }),
        );

        return;
      }

      if (accessTokenDecodedResult.val.data.none) {
        response.status(200).json(
          createHttpResponseError({
            error: Some("Access token is invalid"),
            request,
            status: 401,
            triggerLogout: true,
          }),
        );

        return;
      }

      const accessTokenDecoded = accessTokenDecodedResult.val.data.safeUnwrap();
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
          createHttpResponseError({
            error: deleteSessionResult.val.data,
            request,
            status: 401,
            triggerLogout: true,
          }),
        );

        return;
      }

      response.status(200).json(
        createHttpResponseSuccess({
          accessToken: None,
          data: Some(true),
          message: "User logged out successfully",
        }),
      );
    } catch (error: unknown) {
      await createNewResourceService(
        createErrorLogSchema(
          { data: Some(error), message: Some("Error logging out user") },
          request.body,
        ),
        ErrorLogModel,
      );

      response.status(200).json(
        createHttpResponseError({
          error: Some(error),
          request,
          status: 401,
          triggerLogout: true,
        }),
      );
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
    const { filter } = request.query;

    const isUsernameOrEmailExistsResult = await getResourceByFieldService({
      filter: filter as FilterQuery<Doc>,
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
          error: isUsernameOrEmailExistsResult.val.data,
          request,
          status: 401,
        }),
      );
      return;
    }

    // username or email exists
    if (isUsernameOrEmailExistsResult.val.data.some) {
      response.status(200).json(
        createHttpResponseSuccess({
          data: Some(true),
          accessToken: None,
          message: "Username or email already exists",
        }),
      );
      return;
    }

    // username or email does not exist
    response.status(200).json(
      createHttpResponseSuccess({
        accessToken: None,
        data: Some(false),
        message: "Username or email does not exist",
      }),
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
