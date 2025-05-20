const ACCESS_TOKEN_EXPIRY = "5s"; // 5 seconds

const HASH_SALT_ROUNDS = 10;

const TRIGGER_LOGOUT_KEY = "triggerLogout";

const PROPERTY_DESCRIPTOR: PropertyDescriptor = {
  configurable: true,
  enumerable: true,
  writable: true,
};

const FILE_UPLOAD_EXPIRY = Date.now() + 1000 * 60 * 60 * 1; // 1 hours
const NEW_USER_EXPIRY = Date.now() + 1000 * 60 * 60 * 1; // 1 hours

export {
  ACCESS_TOKEN_EXPIRY,
  FILE_UPLOAD_EXPIRY,
  HASH_SALT_ROUNDS,
  NEW_USER_EXPIRY,
  PROPERTY_DESCRIPTOR,
  TRIGGER_LOGOUT_KEY,
};
