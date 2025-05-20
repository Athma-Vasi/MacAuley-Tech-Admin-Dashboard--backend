import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Err, None, Ok, type Option, Some } from "ts-results";
import type { ErrorLogSchema } from "../resources/errorLog";
import type {
  DecodedToken,
  HttpServerResponse,
  RequestAfterJWTVerification,
  SafeBoxResult,
} from "../types";

function createHttpResponseError<Data = unknown>({
  accessToken = None,
  data = None,
  kind = "error",
  message = "Unexpected error occurred",
  pages = 0,
  status = 500,
  totalDocuments = 0,
  triggerLogout = false,
}: {
  accessToken?: Option<string>;
  data?: Option<Data>;
  kind?: "error" | "success";
  message?: string;
  pages?: number;
  status?: number;
  totalDocuments?: number;
  triggerLogout?: boolean;
}): HttpServerResponse<Data> {
  const statusDescriptionTable: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    406: "Not Acceptable",
    407: "Proxy Authentication Required",
    408: "Request Timeout",
    409: "Conflict",
    410: "Gone",
    411: "Length Required",
    412: "Precondition Failed",
    413: "Payload Too Large",
    414: "URI Too Long",
    415: "Unsupported Media Type",
    416: "Range Not Satisfiable",
    417: "Expectation Failed",
    418: "I'm a teapot",
    421: "Misdirected Request",
    422: "Unprocessable Entity",
    423: "Locked",
    424: "Failed Dependency",
    425: "Too Early",
    426: "Upgrade Required",
    428: "Precondition Required",
    429: "Too Many Requests",
    431: "Request Header Fields Too Large",
    451: "Unavailable For Legal Reasons",

    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
    505: "HTTP Version Not Supported",
  };

  return {
    accessToken,
    data,
    kind,
    message: message ?? statusDescriptionTable[status] ?? "Unknown error",
    pages,
    status,
    totalDocuments,
    triggerLogout,
  };
}

function createHttpResponseSuccess<
  Data = unknown,
>({
  accessToken = None,
  data = None,
  kind = "success",
  message = "Successful operation",
  pages = 0,
  status = 200,
  totalDocuments = 0,
  triggerLogout = false,
}: {
  accessToken?: Option<string>;
  data?: Option<Data>;
  kind?: "error" | "success";
  message?: string;
  pages?: number;
  status?: number;
  totalDocuments?: number;
  triggerLogout?: boolean;
}): HttpServerResponse<Data> {
  return {
    accessToken,
    data,
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
  requestBody: RequestAfterJWTVerification["body"],
): ErrorLogSchema {
  const userInfo = requestBody.userInfo ?? {};

  const sessionId = requestBody.sessionId;
  const userId = userInfo?.userId ?? "";
  const username = userInfo?.username ?? "";

  const unknownError = ".·°՞(¯□¯)՞°·. An unknown error occurred";

  const message = error instanceof Error ? error.message : unknownError;

  const name = error instanceof Error ? error.name : unknownError;

  let stack = error instanceof Error ? error.stack : unknownError;
  stack = stack ?? unknownError;

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
  toFixedFloat,
  verifyJWTSafe,
};
