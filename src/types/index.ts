import type { Request, Response } from "express";
import type { FilterQuery, QueryOptions, Types } from "mongoose";
import type { ParsedQs } from "qs";
import type { Result } from "ts-results";
import type { UserRoles } from "../resources/user";

type DecodedToken = {
  userId: Types.ObjectId;
  username: string;
  roles: UserRoles;
  sessionId: Types.ObjectId;
  iat: number;
  exp: number;
};

/**
 * type signature of query object created by express
 */
type QueryObjectParsed = {
  [x: string]: string | ParsedQs | string[] | ParsedQs[] | undefined;
};

/**
 * - Type signature of query object created after assignQueryDefaults middleware runs
 * - passed to ${Model}.find() functions for GET queried resources service functions (excepting get${resource}ByIdService)
 */
type QueryObjectParsedWithDefaults<
  Doc extends Record<string, unknown> = Record<string, unknown>,
> = {
  filter?: FilterQuery<Doc>;
  projection?: QueryOptions<Doc> | null;
  options?: QueryOptions<Doc>;
};

/**
 * - adds the decoded JWT (which is the userInfo object) from verifyJWTMiddleware to the request body.
 * - All routes' (except user, customer registration POST) subsequent middleware and controller functions will have access to the decoded JWT.
 */
type RequestAfterJWTVerification = Request & {
  body: {
    accessToken: string;
    sessionId: string;
    userId: string;
    username: string;
    roles: UserRoles;
  };
};

/**
 * - shape of the Express Request object after assignQueryDefaults middleware runs.
 * - verifyJWTMiddleware => verifyRoles => assignQueryDefaults => controller function
 * - Typically used in GET requests (all requests routes for some resources).
 * - Query object fields are used in service functions: ${resource}Model.find(filter, projection, options) method.
 */
type RequestAfterQueryParsing = RequestAfterJWTVerification & {
  body: {
    newQueryFlag: boolean;
    totalDocuments: number;
  };
  query: QueryObjectParsedWithDefaults;
};

type CreateNewResourceRequest<
  Schema extends Record<string, unknown> = Record<string, unknown>,
> = RequestAfterQueryParsing & {
  body: {
    schema: Schema;
  };
};

type GetResourceByIdRequest = RequestAfterQueryParsing & {
  params: {
    resourceId: string;
  };
};

type GetResourceByFieldRequest = RequestAfterQueryParsing & {
  body: {
    fields: Record<string, unknown>;
  };
};

type UpdateResourceByIdRequest<
  Resource extends Record<string, unknown> = Record<string, unknown>,
> = RequestAfterQueryParsing & {
  body: {
    documentUpdate: DocumentUpdateOperation<Resource>;
  };
  params: {
    resourceId: string;
  };
};

type DeleteResourceRequest = GetResourceByIdRequest;

type DeleteAllResourcesRequest = RequestAfterQueryParsing;

type GetQueriedResourceRequest = RequestAfterQueryParsing;

type GetQueriedResourceByUserRequest = GetQueriedResourceRequest & {
  body: {
    userToBeQueriedId: Types.ObjectId;
  };
};

type LoginUserRequest = Request & {
  body: {
    schema: {
      username: string;
      password: string;
    };
  };
};

type HttpResult<Data = unknown> = {
  accessToken: string;
  data: Array<Data>;
  kind: "error" | "success";
  message: string;
  pages: number;
  status: number;
  totalDocuments: number;
  triggerLogout: boolean;
};

type DBRecord = Record<string, unknown> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
};

/**
 * -
 */
type Success<Data = unknown> = {
  data: [Data];
  kind: "success";
} | {
  data: [];
  kind: "notFound";
} | {
  data: [];
  kind: "mildError";
};

type NotSuccess = {
  data: unknown;
  message: string;
};

type ServiceResult<Data = unknown> = Promise<
  Result<Success<Data>, NotSuccess>
>;

type HttpServerResponse<Data = unknown> = Response<
  Awaited<HttpResult<Data>>
>;

/**
 * Used in the getQueried${resource}Service default GET request service functions for all resources.
 */
type QueriedResourceGetRequestServiceInput<
  Document extends Record<string, unknown> = Record<string, unknown>,
> = {
  filter?: FilterQuery<Document>;
  projection?: QueryOptions<Document> | null;
  options?: QueryOptions<Document>;
};

/**
 * - This type is used to get rid of the projection and options params in the getQueried${resource}Service functions.
 * - The service function counts the total number of documents that match the filter params and returns the totalDocuments count.
 */
type QueriedTotalResourceGetRequestServiceInput<
  Document extends Record<string, unknown> = Record<string, unknown>,
> = Omit<
  QueriedResourceGetRequestServiceInput<Document>,
  "projection" | "options"
>;

/**
 * - Used in the PATCH request body field: 'documentUpdate'.
 * - Shared with frontend to ensure that the request body contains correct data shape.
 */
type DocumentUpdateOperation<
  Document extends Record<string, unknown> = Record<string, unknown>,
> =
  | DocumentFieldUpdateOperation<Document>
  | DocumentArrayUpdateOperation<Document>;

type FieldOperators =
  | "$currentDate"
  | "$inc"
  | "$min"
  | "$max"
  | "$mul"
  | "$rename"
  | "$set"
  | "$setOnInsert"
  | "$unset";

type DocumentFieldUpdateOperation<
  Document extends Record<string, unknown> = Record<string, unknown>,
> = {
  updateKind: "field";
  updateOperator: FieldOperators;
  fields: Partial<Document>;
};

type ArrayOperators = "$addToSet" | "$pop" | "$pull" | "$push" | "$pullAll";

type DocumentArrayUpdateOperation<
  Document extends Record<string, unknown> = Record<string, unknown>,
> = {
  updateKind: "array";
  updateOperator: ArrayOperators;
  fields: Partial<Document>;
};

export type {
  ArrayOperators,
  CreateNewResourceRequest,
  DBRecord,
  DecodedToken,
  DeleteAllResourcesRequest,
  DeleteResourceRequest,
  DocumentUpdateOperation,
  FieldOperators,
  GetQueriedResourceByUserRequest,
  GetQueriedResourceRequest,
  GetResourceByFieldRequest,
  GetResourceByIdRequest,
  HttpResult,
  HttpServerResponse,
  LoginUserRequest,
  QueriedResourceGetRequestServiceInput,
  QueriedTotalResourceGetRequestServiceInput,
  QueryObjectParsed,
  QueryObjectParsedWithDefaults,
  RequestAfterJWTVerification,
  RequestAfterQueryParsing,
  ServiceResult,
  Success,
  UpdateResourceByIdRequest,
};
