const ACCESS_TOKEN_EXPIRY = "5s"; // 5 seconds

const HASH_SALT_ROUNDS = 10;

const TRIGGER_LOGOUT_KEY = "triggerLogout";

const PROPERTY_DESCRIPTOR: PropertyDescriptor = {
  configurable: false,
  enumerable: true,
  writable: true,
};

const FILE_UPLOAD_EXPIRY = Date.now() + 1000 * 60 * 60 * 1; // 1 hours
const NEW_USER_EXPIRY = Date.now() + 1000 * 60 * 60 * 1; // 1 hours
const INVALID_CREDENTIALS = "INVALID_CREDENTIALS";

const STATUS_DESCRIPTION_TABLE: Record<number, string> = {
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

export {
  ACCESS_TOKEN_EXPIRY,
  FILE_UPLOAD_EXPIRY,
  HASH_SALT_ROUNDS,
  INVALID_CREDENTIALS,
  NEW_USER_EXPIRY,
  PROPERTY_DESCRIPTOR,
  STATUS_DESCRIPTION_TABLE,
  TRIGGER_LOGOUT_KEY,
};
