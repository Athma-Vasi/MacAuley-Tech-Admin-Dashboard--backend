import bcrypt from "bcryptjs";
import type { Request } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { Err, None, Ok, type Option, Some } from "ts-results";
import { STATUS_DESCRIPTION_TABLE } from "../constants";
import type { ErrorLogSchema } from "../resources/errorLog";
import type {
  DecodedToken,
  RequestAfterJWTVerification,
  ResponsePayloadResult,
  SafeBoxError,
  SafeBoxResult,
} from "../types";

function createHttpResponseError<
  ModifiedRequest extends Request = Request,
  Data = unknown,
>({
  data = None,
  error,
  kind = "error",
  pages = 0,
  request,
  status = 500,
  totalDocuments = 0,
  triggerLogout = false,
}: {
  data?: Option<Data>;
  error: Option<unknown>;
  kind?: "error" | "success";
  request: ModifiedRequest;
  pages?: number;
  status?: number;
  totalDocuments?: number;
  triggerLogout?: boolean;
}): ResponsePayloadResult<Data> {
  const accessToken = request.body.accessToken
    ? Some(request.body.accessToken)
    : None;

  const message = error.none
    ? STATUS_DESCRIPTION_TABLE[status] ?? "Unknown error"
    : error.val instanceof Error
    ? error.val.message
    : typeof error === "string"
    ? error
    : JSON.stringify(error);

  return new Err({
    accessToken,
    data,
    kind,
    message,
    pages,
    status,
    totalDocuments,
    triggerLogout,
  });
}

function createHttpResponseSuccess<Data = unknown>({
  accessToken,
  data = None,
  kind = "success",
  message = "Successful operation",
  pages = 0,
  status = 200,
  totalDocuments = 0,
  triggerLogout = false,
}: {
  accessToken: Option<string>;
  data: Option<Data>;
  kind?: "error" | "success";
  message?: string;
  pages?: number;
  status?: number;
  totalDocuments?: number;
  triggerLogout?: boolean;
}): ResponsePayloadResult<Data> {
  return new Ok({
    accessToken,
    data,
    kind,
    message,
    pages,
    status,
    totalDocuments,
    triggerLogout,
  });
}

function createErrorLogSchema(
  error: SafeBoxError<unknown>,
  requestBody: RequestAfterJWTVerification["body"],
): ErrorLogSchema {
  if (error.data.none) {
    return {
      expireAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
      message: "Error data is empty",
      name: "Error data is empty",
      stack: "Error data is empty",
      requestBody: JSON.stringify(requestBody),
      sessionId: "",
      timestamp: new Date(),
      userId: "",
      username: "",
    };
  }

  const userInfo = requestBody.userInfo ?? {};
  const sessionId = requestBody.sessionId;
  const userId = userInfo?.userId ?? "";
  const username = userInfo?.username ?? "";
  const unknownError = ".·°՞(¯□¯)՞°·. An unknown error occurred";
  const message = error.data.val instanceof Error
    ? error.data.val.message
    : unknownError;
  const name = error.data.val instanceof Error
    ? error.data.val.name
    : unknownError;
  const stack = error.data.val instanceof Error && error.data.val.stack
    ? error.data.val.stack
    : unknownError;

  return {
    expireAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
    message,
    name,
    stack,
    requestBody: JSON.stringify(requestBody),
    sessionId: sessionId?.toString() ?? "",
    timestamp: new Date(),
    userId: userId?.toString() ?? "",
    username: username ?? "",
  };
}

async function compareHashedStringWithPlainStringSafe({
  hashedString,
  plainString,
}: {
  hashedString: string;
  plainString: string;
}): Promise<SafeBoxResult<boolean, unknown>> {
  try {
    const isMatch = await bcrypt.compare(plainString, hashedString);
    return new Ok({ data: Some(isMatch) });
  } catch (error: unknown) {
    return new Err({
      data: Some(error),
      message: Some("Error comparing strings"),
    });
  }
}

async function hashStringSafe({ saltRounds, stringToHash }: {
  saltRounds: number;
  stringToHash: string;
}): Promise<SafeBoxResult<string, unknown>> {
  try {
    const hashedString = await bcrypt.hash(stringToHash, saltRounds);
    return new Ok({ data: Some(hashedString) });
  } catch (error: unknown) {
    return new Err({
      data: Some(error),
      message: Some("Error hashing string"),
    });
  }
}

async function decodeJWTSafe(
  token: string,
): Promise<SafeBoxResult<DecodedToken, unknown>> {
  try {
    const decoded = jwt.decode(token, { json: true }) as DecodedToken | null;
    if (decoded === null) {
      return new Ok({ data: None, message: Some("Token is invalid") });
    }

    return new Ok({ data: Some(decoded) });
  } catch (error: unknown) {
    return new Err({ data: Some(error), message: Some("Error decoding JWT") });
  }
}

async function verifyJWTSafe(
  { seed, token }: {
    seed: string;
    token: string;
  },
): Promise<SafeBoxResult<DecodedToken, unknown>> {
  try {
    const decoded = jwt.verify(token, seed) as DecodedToken;
    return new Ok({ data: Some(decoded) });
  } catch (error: unknown) {
    return error instanceof Error && error?.name === "TokenExpiredError"
      ? new Ok({ data: None, message: Some("Token is expired") })
      : new Err({ data: Some(error), message: Some("Error verifying JWT") });
  }
}

function signJWTSafe({ payload, secretOrPrivateKey, options }: {
  payload: string | Buffer | object;
  secretOrPrivateKey: jwt.Secret | jwt.PrivateKey;
  options?: SignOptions;
}) {
  try {
    const token = jwt.sign(payload, secretOrPrivateKey, options);
    return new Ok({ data: Some(token) });
  } catch (error: unknown) {
    return new Err({ data: Some(error), message: Some("Error signing JWT") });
  }
}

function returnEmptyFieldsTuple(input: Record<string, unknown>) {
  const fieldValuesTuples: [string, boolean][] = Object.entries(input).map(
    ([field, value]) => [field, value === ""],
  );

  return fieldValuesTuples.filter(([_, value]) => value === true);
}

function removeUndefinedAndNullValues<T>(value?: T | null): value is T {
  return value !== undefined && value !== null;
}

type FilterFieldsFromObjectInput<
  Obj extends Record<string | number | symbol, unknown> = Record<
    string | symbol | number,
    unknown
  >,
> = {
  object: Obj;
  fieldsToFilter: Set<keyof Obj>;
};
/**
 * Pure function: Removes specified fields from an object and returns a new object with the remaining fields.
 */
function filterFieldsFromObject<
  Obj extends Record<string | number | symbol, unknown> = Record<
    string | symbol | number,
    unknown
  >,
  Keys extends keyof Obj = keyof Obj,
>({
  object,
  fieldsToFilter,
}: FilterFieldsFromObjectInput<Obj>): Omit<Obj, Keys> {
  return Object.entries(object).reduce((obj, [key, value]) => {
    if (fieldsToFilter.has(key)) {
      return obj;
    }
    obj[key] = value;

    return obj;
  }, Object.create(null));
}

function toFixedFloat(num: number, precision = 4): number {
  return Number(num.toFixed(precision));
}

export {
  compareHashedStringWithPlainStringSafe,
  createErrorLogSchema,
  createHttpResponseError,
  createHttpResponseSuccess,
  decodeJWTSafe,
  filterFieldsFromObject,
  hashStringSafe,
  removeUndefinedAndNullValues,
  returnEmptyFieldsTuple,
  signJWTSafe,
  toFixedFloat,
  verifyJWTSafe,
};
