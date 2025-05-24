import bcrypt from "bcryptjs";
import type { Request } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { Err, None, Ok, type Option, Some } from "ts-results";
import { PROPERTY_DESCRIPTOR } from "../constants";
import type { ErrorLogSchema } from "../resources/errorLog";
import type {
  DecodedToken,
  RequestAfterJWTVerification,
  ResponsePayload,
  SafeError,
  SafeResult,
} from "../types";

function createHttpResponseError<
  ModifiedRequest extends Request = Request,
  Data = unknown,
>({
  safeErrorResult,
  kind = "error",
  pages,
  request,
  status,
  totalDocuments,
  triggerLogout,
}: {
  safeErrorResult: Err<SafeError>;
  kind?: "error" | "success";
  request: ModifiedRequest;
  pages?: number;
  status?: number;
  totalDocuments?: number;
  triggerLogout?: boolean;
}): ResponsePayload<Data> {
  const responsePayload: ResponsePayload<Data> = {
    accessToken: request.body.accessToken ?? "",
    data: [],
    kind,
  };

  const { message, name } = safeErrorResult.val;
  if (message) {
    Object.defineProperty(responsePayload, "message", {
      value: `${name}: ${message}`,
      ...PROPERTY_DESCRIPTOR,
    });
  }
  if (pages) {
    Object.defineProperty(responsePayload, "pages", {
      value: pages,
      ...PROPERTY_DESCRIPTOR,
    });
  }
  if (status) {
    Object.defineProperty(responsePayload, "status", {
      value: status,
      ...PROPERTY_DESCRIPTOR,
    });
  }
  if (totalDocuments) {
    Object.defineProperty(responsePayload, "totalDocuments", {
      value: totalDocuments,
      ...PROPERTY_DESCRIPTOR,
    });
  }
  if (triggerLogout) {
    Object.defineProperty(responsePayload, "triggerLogout", {
      value: triggerLogout,
      ...PROPERTY_DESCRIPTOR,
    });
  }

  return {
    accessToken: request.body.accessToken ? request.body.accessToken : "",
    data: [],
    kind,
    message: `${safeErrorResult.val.name}: ${safeErrorResult.val.message}`,
    pages,
    status,
    totalDocuments,
    triggerLogout,
  };
}

function createHttpResponseSuccess<Data = unknown>({
  safeSuccessResult,
  kind = "success",
  message,
  pages,
  request,
  status,
  totalDocuments,
  triggerLogout,
}: {
  safeSuccessResult: Ok<Option<NonNullable<Data>>>;
  kind?: "error" | "success";
  message?: string;
  pages?: number;
  request: RequestAfterJWTVerification;
  status?: number;
  totalDocuments?: number;
  triggerLogout?: boolean;
}): ResponsePayload<Data> {
  const newData = safeSuccessResult.val.none ? [] : safeSuccessResult.val.val;

  const responsePayload: ResponsePayload<Data> = {
    accessToken: request.body.accessToken ?? "",
    data: Array.isArray(newData) ? newData : [newData],
    kind,
  };

  if (message) {
    Object.defineProperty(responsePayload, "message", {
      value: serializeSafe(message),
      ...PROPERTY_DESCRIPTOR,
    });
  }
  if (pages) {
    Object.defineProperty(responsePayload, "pages", {
      value: pages,
      ...PROPERTY_DESCRIPTOR,
    });
  }
  if (status) {
    Object.defineProperty(responsePayload, "status", {
      value: status,
      ...PROPERTY_DESCRIPTOR,
    });
  }
  if (totalDocuments) {
    Object.defineProperty(responsePayload, "totalDocuments", {
      value: totalDocuments,
      ...PROPERTY_DESCRIPTOR,
    });
  }
  if (triggerLogout) {
    Object.defineProperty(responsePayload, "triggerLogout", {
      value: triggerLogout,
      ...PROPERTY_DESCRIPTOR,
    });
  }

  return {
    accessToken: request.body.accessToken ? request.body.accessToken : "",
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
  safeError: Err<SafeError>,
  request: RequestAfterJWTVerification,
): ErrorLogSchema {
  const { message, name, original, stack } = safeError.val;
  const { body = {} } = request;
  const { username = "unknown", userId = "unknown", sessionId = "unknown" } =
    body;
  const { headers, ip, method, path } = request;

  const errorLog: ErrorLogSchema = {
    message: message,
    name: name,
    stack: stack.none ? "ｶ ｷ ｸ ｹ ｺ ｻ ｼ ｽ" : stack.val,
    original: original.none ? "ｾ ｿ ﾀ ﾁ ﾂ ﾃ ﾄ ﾅ" : original.val,
    body: serializeSafe(body),
    sessionId: sessionId.toString(),
    userId: userId.toString(),
    username: username,
  };

  if (headers) {
    Object.defineProperty(errorLog, "headers", {
      value: serializeSafe(headers),
      ...PROPERTY_DESCRIPTOR,
    });
  }
  if (ip) {
    Object.defineProperty(errorLog, "ip", {
      value: ip,
      ...PROPERTY_DESCRIPTOR,
    });
  }
  if (method) {
    Object.defineProperty(errorLog, "method", {
      value: method,
      ...PROPERTY_DESCRIPTOR,
    });
  }
  if (path) {
    Object.defineProperty(errorLog, "path", {
      value: path,
      ...PROPERTY_DESCRIPTOR,
    });
  }
  if (request.headers["user-agent"]) {
    Object.defineProperty(errorLog, "userAgent", {
      value: request.headers["user-agent"],
      ...PROPERTY_DESCRIPTOR,
    });
  }

  return errorLog;
}

async function compareHashedStringWithPlainStringSafe({
  hashedString,
  plainString,
}: {
  hashedString: string;
  plainString: string;
}): Promise<SafeResult<boolean>> {
  try {
    const isMatch = await bcrypt.compare(plainString, hashedString);
    return createSafeSuccessResult(isMatch);
  } catch (error: unknown) {
    return createSafeErrorResult(error);
  }
}

async function hashStringSafe({ saltRounds, stringToHash }: {
  saltRounds: number;
  stringToHash: string;
}): Promise<SafeResult<string>> {
  try {
    const hashedString = await bcrypt.hash(stringToHash, saltRounds);
    return createSafeSuccessResult(hashedString);
  } catch (error: unknown) {
    return createSafeErrorResult(error);
  }
}

async function decodeJWTSafe(
  token: string,
): Promise<SafeResult<DecodedToken>> {
  try {
    const decoded = jwt.decode(token, { json: true }) as DecodedToken | null;
    return createSafeSuccessResult(decoded);
  } catch (error: unknown) {
    return createSafeErrorResult(error);
  }
}

async function verifyJWTSafe(
  { seed, token }: {
    seed: string;
    token: string;
  },
): Promise<SafeResult<DecodedToken>> {
  try {
    const decoded = jwt.verify(token, seed) as DecodedToken;
    return createSafeSuccessResult(decoded);
  } catch (error: unknown) {
    return error instanceof Error && error?.name === "TokenExpiredError"
      ? new Ok(None)
      : createSafeErrorResult(error);
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
): Ok<Option<NonNullable<Data>>> {
  return new Ok(data == null ? None : Some(data));
}

function serializeSafe(data: unknown): string {
  try {
    const serializedData = JSON.stringify(data, null, 2);
    return serializedData;
  } catch (error: unknown) {
    return "Unserializable data";
  }
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

  if (error instanceof Event) {
    if (error instanceof PromiseRejectionEvent) {
      return new Err({
        name: `PromiseRejectionEvent: ${error.type}`,
        message: error.reason.toString() ?? "",
        stack: None,
        original: Some(serializeSafe(error)),
      });
    }

    return new Err({
      name: `EventError: ${error.type}`,
      message: error.timeStamp.toString() ?? "",
      stack: None,
      original: Some(serializeSafe(error)),
    });
  }

  return new Err({
    name: "SimulationDysfunction",
    message: "You've seen it before. Déjà vu. Something's off...",
    stack: None,
    original: Some(serializeSafe(error)),
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
  serializeSafe,
  signJWTSafe,
  toFixedFloat,
  verifyJWTSafe,
};
