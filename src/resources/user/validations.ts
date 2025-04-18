import Joi from "joi";
import {
  ADDRESS_LINE_REGEX,
  ALL_STORE_LOCATIONS_REGEX,
  CITY_REGEX,
  COUNTRY_REGEX,
  DEPARTMENT_REGEX,
  FULL_NAME_REGEX,
  JOB_POSITION_REGEX,
  PASSWORD_REGEX,
  POSTAL_CODE_CANADA_REGEX,
  POSTAL_CODE_US_REGEX,
  PROVINCE_REGEX,
  STATES_US_REGEX,
  USER_ROLES_REGEX,
  USERNAME_REGEX,
} from "../../regex";
import type { UserSchema } from "./model";

const createUserJoiSchema = Joi.object<UserSchema>({
  username: Joi.string().regex(USERNAME_REGEX).required(),
  password: Joi.string().regex(PASSWORD_REGEX).required(),
  email: Joi.string().email().required(),
  addressLine: Joi.string().regex(ADDRESS_LINE_REGEX).required(),
  city: Joi.string().regex(CITY_REGEX).required(),
  country: Joi.string().regex(COUNTRY_REGEX).required(),
  postalCodeCanada: Joi.string().regex(POSTAL_CODE_CANADA_REGEX).required(),
  postalCodeUS: Joi.string().regex(POSTAL_CODE_US_REGEX).required(),
  province: Joi.string().regex(PROVINCE_REGEX).required(),
  state: Joi.string().regex(STATES_US_REGEX).required(),
  storeLocation: Joi.string().regex(ALL_STORE_LOCATIONS_REGEX).required(),
  department: Joi.string().regex(DEPARTMENT_REGEX).required(),
  firstName: Joi.string().regex(FULL_NAME_REGEX).required(),
  lastName: Joi.string().regex(FULL_NAME_REGEX).required(),
  jobPosition: Joi.string().regex(JOB_POSITION_REGEX).required(),
  orgId: Joi.number().required(),
  parentOrgId: Joi.number().required(),
  profilePictureUrl: Joi.string().required(),
  roles: Joi.array().items(Joi.string().regex(USER_ROLES_REGEX)).required(),
});

const createUsersInBulkJoiSchema = Joi.array().items(
  createUserJoiSchema,
);

const updateUserJoiSchema = Joi.object<UserSchema>({
  username: Joi.string().regex(USERNAME_REGEX).optional(),
  password: Joi.string().regex(PASSWORD_REGEX).optional(),
  email: Joi.string().email().optional(),
  addressLine: Joi.string().regex(ADDRESS_LINE_REGEX).optional(),
  city: Joi.string().regex(CITY_REGEX).optional(),
  country: Joi.string().regex(COUNTRY_REGEX).optional(),
  postalCodeCanada: Joi.string().regex(POSTAL_CODE_CANADA_REGEX).optional(),
  postalCodeUS: Joi.string().regex(POSTAL_CODE_US_REGEX).optional(),
  province: Joi.string().regex(PROVINCE_REGEX).optional(),
  state: Joi.string().regex(STATES_US_REGEX).optional(),
  storeLocation: Joi.string().regex(ALL_STORE_LOCATIONS_REGEX).optional(),
  department: Joi.string().regex(DEPARTMENT_REGEX).optional(),
  firstName: Joi.string().regex(FULL_NAME_REGEX).optional(),
  lastName: Joi.string().regex(FULL_NAME_REGEX).optional(),
  jobPosition: Joi.string().regex(JOB_POSITION_REGEX).optional(),
  orgId: Joi.number().optional(),
  parentOrgId: Joi.number().optional(),
  profilePictureUrl: Joi.string().optional(),
  roles: Joi.array().items(Joi.string().regex(USER_ROLES_REGEX)).optional(),
});

export { createUserJoiSchema, createUsersInBulkJoiSchema, updateUserJoiSchema };
