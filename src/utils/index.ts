import bcrypt from "bcryptjs";
import type { Request } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { Err, None, Ok, type Option, Some } from "ts-results";
import { STATUS_DESCRIPTION_TABLE } from "../constants";
import type { ErrorLogSchema } from "../resources/errorLog";
import type {
  DecodedToken,
  RequestAfterJWTVerification,
  ResponsePayload,
  SafeError,
} from "../types";

function createHttpResponseError<
  ModifiedRequest extends Request = Request,
  Data = unknown,
>({
  error,
  kind = "error",
  pages = 0,
  request,
  status = 500,
  totalDocuments = 0,
  triggerLogout = false,
}: {
  error: Option<unknown>;
  kind?: "error" | "success";
  request: ModifiedRequest;
  pages?: number;
  status?: number;
  totalDocuments?: number;
  triggerLogout?: boolean;
}): ResponsePayload<Data> {
  const message = error.none
    ? STATUS_DESCRIPTION_TABLE[status] ?? "Unknown error"
    : error.val instanceof Error
    ? error.val.message
    : typeof error === "string"
    ? error
    : JSON.stringify(error);

  return {
    accessToken: request.body.accessToken ? request.body.accessToken : "",
    data: [],
    kind,
    message,
    pages,
    status,
    totalDocuments,
    triggerLogout,
  };
}

function createHttpResponseSuccess<Data = unknown>({
  accessToken,
  data,
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
}): ResponsePayload<Data> {
  const newData = data.none ? [] : data.safeUnwrap();

  return {
    accessToken: accessToken.none ? "" : accessToken.safeUnwrap(),
    data: Array.isArray(newData) ? newData : [newData],
    kind,
    message,
    pages,
    status,
    totalDocuments,
    triggerLogout,
  };
}

function createErrorLogSchema(
  error: unknown,
  request: RequestAfterJWTVerification,
): ErrorLogSchema {
  const safeErrorResult = createSafeErrorResult(error);

  return {
    expireAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
    message: safeErrorResult.val.message,
    name: safeErrorResult.val.name,
    stack: safeErrorResult.val.stack.none
      ? "ｶ ｷ ｸ ｹ ｺ ｻ ｼ ｽ"
      : safeErrorResult.val.stack.val,
    body: JSON.stringify(request.body),
    sessionId: request.body.sessionId?.toString() ?? "unknown",
    timestamp: new Date(),
    userId: request.body.userId?.toString() ?? "unknown",
    username: request.body.username ?? "unknown",
    ip: request.ip,
    userAgent: request.headers["user-agent"],
    original: safeErrorResult.val.original.none
      ? "ｾ ｿ ﾀ ﾁ ﾂ ﾃ ﾄ ﾅ"
      : safeErrorResult.val.original.val,
    method: request.method,
    headers: JSON.stringify(request.headers),
    path: request.path,
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

function createSafeSuccessResult<Data = unknown>(
  data: Data,
): Ok<Option<Data>> {
  return new Ok(data == null ? None : Some(data));
}

function createSafeErrorResult(error: unknown): Err<SafeError> {
  if (error instanceof Error) {
    return new Err({
      name: error.name == null ? "Error" : error.name,
      message: error.message == null ? "Unknown error" : error.message,
      stack: error.stack == null ? None : Some(error.stack),
      original: None,
    });
  }

  if (typeof error === "string") {
    return new Err({
      name: "Error",
      message: error,
      stack: None,
      original: None,
    });
  }

  function serializeSafe(data: unknown): Option<string> {
    try {
      const serializedData = JSON.stringify(data, null, 2);
      return Some(serializedData);
    } catch (error: unknown) {
      return Some("Unserializable data");
    }
  }

  if (error instanceof Event) {
    if (error instanceof PromiseRejectionEvent) {
      return new Err({
        name: `PromiseRejectionEvent: ${error.type}`,
        message: error.reason.toString() ?? "",
        stack: None,
        original: serializeSafe(error),
      });
    }

    return new Err({
      name: `EventError: ${error.type}`,
      message: error.timeStamp.toString() ?? "",
      stack: None,
      original: serializeSafe(error),
    });
  }

  return new Err({
    name: "SimulationDysfunction",
    message: "You've seen it before. Déjà vu. Something's off...",
    stack: None,
    original: serializeSafe(error),
  });
}

export {
  compareHashedStringWithPlainStringSafe,
  createErrorLogSchema,
  createHttpResponseError,
  createHttpResponseSuccess,
  createSafeErrorResult,
  createSafeSuccessResult,
  decodeJWTSafe,
  filterFieldsFromObject,
  hashStringSafe,
  removeUndefinedAndNullValues,
  returnEmptyFieldsTuple,
  signJWTSafe,
  toFixedFloat,
  verifyJWTSafe,
};
