const REFRESH_TOKEN_EXPIRY = "12h"; // 12 hours

const ACCESS_TOKEN_EXPIRY = "5s"; // 5 seconds

const HASH_SALT_ROUNDS = 10;

const TRIGGER_LOGOUT_KEY = "triggerLogout";

const PROPERTY_DESCRIPTOR: PropertyDescriptor = {
  configurable: true,
  enumerable: true,
  writable: true,
};

export {
  ACCESS_TOKEN_EXPIRY,
  HASH_SALT_ROUNDS,
  PROPERTY_DESCRIPTOR,
  REFRESH_TOKEN_EXPIRY,
  TRIGGER_LOGOUT_KEY,
};
