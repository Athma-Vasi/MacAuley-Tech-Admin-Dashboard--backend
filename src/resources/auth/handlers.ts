import { type Response } from "express";
import jwt from "jsonwebtoken";
import type { Model } from "mongoose";
import { CONFIG } from "../../config";
import { ACCESS_TOKEN_EXPIRY, HASH_SALT_ROUNDS } from "../../constants";
import {
  createNewResourceService,
  deleteResourceByIdService,
  getResourceByFieldService,
} from "../../services";
import type {
  CreateNewResourceRequest,
  DBRecord,
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
import { type FinancialMetricsDocument } from "../metrics/financial/model";
import { createRandomBusinessMetrics } from "../metrics/utils";
import { type UserDocument, UserModel, type UserSchema } from "../user";
import { AuthModel, type AuthSchema } from "./model";

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

      const authSessionSchema: AuthSchema = {
        addressIP: request.ip ?? "",
        // user will be required to log in their session again after 1 day
        // expireAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1),
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
      const businessMetrics = await createRandomBusinessMetrics({
        daysPerMonth: DAYS_PER_MONTH,
        months: MONTHS,
        productCategories: PRODUCT_CATEGORIES,
        repairCategories: REPAIR_CATEGORIES,
        storeLocations: STORE_LOCATIONS,
      });

      // function createProductMetricsSchemas(
      //   businessMetrics: BusinessMetric[],
      // ) {
      //   const productMetricsSchemaTemplate: ProductMetricsSchema = {
      //     storeLocation: "All Locations",
      //     metricCategory: "All Products",
      //     year: "2023",
      //     yearlyMetrics: {} as ProductYearlyMetric,
      //   };

      //   return businessMetrics.reduce((acc, curr) => {
      //     const { storeLocation, productMetrics } = curr;

      //     productMetrics.forEach((productMetric) => {
      //       const { name, yearlyMetrics } = productMetric;

      //       yearlyMetrics.forEach((yearlyMetric) => {
      //         const { year } = yearlyMetric;

      //         const productMetricsSchema = {
      //           ...productMetricsSchemaTemplate,
      //           storeLocation,
      //           metricCategory: name,
      //           year,
      //           yearlyMetrics: yearlyMetric,
      //         };

      //         acc.push(productMetricsSchema);
      //       });
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
      //     year: "2023",
      //     yearlyMetrics: {} as RepairYearlyMetric,
      //   };

      //   return businessMetrics.reduce((acc, curr) => {
      //     const { storeLocation, repairMetrics } = curr;

      //     repairMetrics.forEach((repairMetric) => {
      //       const { name, yearlyMetrics } = repairMetric;

      //       yearlyMetrics.forEach((yearlyMetric) => {
      //         const { year } = yearlyMetric;

      //         const repairMetricsSchema = {
      //           ...repairMetricsSchemaTemplate,
      //           storeLocation,
      //           metricCategory: name,
      //           year,
      //           yearlyMetrics: yearlyMetric,
      //         };

      //         acc.push(repairMetricsSchema);
      //       });
      //     });

      //     return acc;
      //   }, [] as RepairMetricsSchema[]);
      // }

      // function createFinancialMetricsSchemas(
      //   businessMetrics: BusinessMetric[],
      // ) {
      //   const financialMetricsSchemaTemplate: FinancialMetricsSchema = {
      //     storeLocation: "All Locations",
      //     year: "2023",
      //     yearlyMetrics: {} as YearlyFinancialMetric,
      //   };

      //   return businessMetrics.reduce((acc, curr) => {
      //     const { storeLocation, financialMetrics } = curr;

      //     const years = financialMetrics.map((yearlyMetric) => {
      //       const { year } = yearlyMetric;
      //       return year;
      //     });

      //     years.forEach((year) => {
      //       const yearlyMetrics = financialMetrics.find(
      //         (yearlyMetric) => yearlyMetric.year === year,
      //       );

      //       if (yearlyMetrics) {
      //         const financialMetricsSchema = {
      //           ...financialMetricsSchemaTemplate,
      //           storeLocation,
      //           year,
      //           yearlyMetrics,
      //         };

      //         acc.push(financialMetricsSchema);
      //       }
      //     });

      //     return acc;
      //   }, [] as FinancialMetricsSchema[]);
      // }

      // function createCustomerMetricsSchemas(businessMetric: BusinessMetric[]) {
      //   const customerMetricsSchemaTemplate: CustomerMetricsSchema = {
      //     storeLocation: "All Locations",
      //     year: "2023",
      //     yearlyMetrics: {} as CustomerYearlyMetric,
      //   };

      //   return businessMetric.reduce((acc, curr) => {
      //     const { storeLocation, customerMetrics } = curr;

      //     const years = customerMetrics.yearlyMetrics.map((yearlyMetric) => {
      //       const { year } = yearlyMetric;
      //       return year;
      //     });

      //     years.forEach((year) => {
      //       const yearlyMetrics = customerMetrics.yearlyMetrics.find(
      //         (yearlyMetric) => yearlyMetric.year === year,
      //       );

      //       if (yearlyMetrics) {
      //         const customerMetricsSchema = {
      //           ...customerMetricsSchemaTemplate,
      //           storeLocation,
      //           year,
      //           yearlyMetrics,
      //         };

      //         acc.push(customerMetricsSchema);
      //       }
      //     });

      //     return acc;
      //   }, [] as CustomerMetricsSchema[]);
      // }

      // const repairMetricsSchemas = createRepairMetricsSchemas(
      //   businessMetrics,
      // );

      // console.time("repairMetricsDocument");

      // const repairMetricsDocument = await Promise.all(
      //   repairMetricsSchemas.map(
      //     async (repairMetricsSchema) =>
      //       await createNewResourceService(
      //         repairMetricsSchema,
      //         RepairMetricsModel,
      //       ),
      //   ),
      // );

      // console.log("repairMetricsDocument", repairMetricsDocument);

      // console.timeEnd("repairMetricsDocument");

      // const financialMetricsDocumentResult = await getResourceByFieldService({
      //   filter: { storeLocation: "All Locations" },
      //   model: FinancialMetricsModel,
      // });

      // if (financialMetricsDocumentResult.err) {
      //   await createNewResourceService(
      //     createErrorLogSchema(
      //       financialMetricsDocumentResult.val,
      //       request.body,
      //     ),
      //     ErrorLogModel,
      //   );

      //   response.status(200).json(
      //     createHttpResultError({
      //       message: "Unable to get financial metrics document",
      //     }),
      //   );
      //   return;
      // }

      // const financialMetricsDocumentUnwrapped = financialMetricsDocumentResult
      //   .safeUnwrap().data;

      // if (financialMetricsDocumentUnwrapped.length === 0) {
      //   response.status(200).json(
      //     createHttpResultError({
      //       message: "Unable to get financial metrics document",
      //     }),
      //   );
      //   return;
      // }

      response.status(200).json(
        createHttpResultSuccess({
          accessToken,
          data: [{
            userDocument: userDocPartial,
            financialMetricsDocument: {} as FinancialMetricsDocument,
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
        AuthModel,
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

export { loginUserHandler, logoutUserHandler, registerUserHandler };
