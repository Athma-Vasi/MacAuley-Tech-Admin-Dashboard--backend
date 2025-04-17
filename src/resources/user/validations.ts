import Joi from "joi";
import {
  ADDRESS_LINE_REGEX,
  CITY_REGEX,
  FULL_NAME_REGEX,
  PASSWORD_REGEX,
  POSTAL_CODE_CANADA_REGEX,
  POSTAL_CODE_US_REGEX,
  USER_ROLES_REGEX,
  USERNAME_REGEX,
} from "../../regex";

/**
 * type UserSchema = {
   addressLine: string;
   city: string;
   country: Country;
   department: Department;
   email: string;
   firstName: string;
   jobPosition: JobPosition;
   lastName: string;
   password: string;
   postalCodeCanada: CanadianPostalCode;
   postalCodeUS: USPostalCode;
   profilePictureUrl: string;
   province: Province;
   roles: UserRoles;
   state: StatesUS;
   storeLocation: AllStoreLocations;
   username: string;
 };
 */

const createUserJoiSchema = Joi.object({
  username: Joi.string().regex(USERNAME_REGEX).required(),
  password: Joi.string().regex(PASSWORD_REGEX).required(),
  email: Joi.string().email().required(),
  addressLine: Joi.string().regex(ADDRESS_LINE_REGEX).required(),
  city: Joi.string().regex(CITY_REGEX).required(),
  country: Joi.string().valid("Canada", "United States").required(),
  postalCodeCanada: Joi.string().regex(POSTAL_CODE_CANADA_REGEX).optional(),
  postalCodeUS: Joi.string().regex(POSTAL_CODE_US_REGEX).optional(),
  province: Joi.string().optional(),
  state: Joi.string().optional(),
  storeLocation: Joi.string().required(),
  department: Joi.string().required(),
  firstName: Joi.string().regex(FULL_NAME_REGEX).required(),
  lastName: Joi.string().regex(FULL_NAME_REGEX).required(),
  jobPosition: Joi.string().required(),
  profilePictureUrl: Joi.string().required(),
  roles: Joi.array().items(Joi.string().regex(USER_ROLES_REGEX)).required(),
});

const updateUserJoiSchema = Joi.object({
  username: Joi.string().regex(USERNAME_REGEX).optional(),
  password: Joi.string().regex(PASSWORD_REGEX).optional(),
  email: Joi.string().email().optional(),
  addressLine: Joi.string().regex(ADDRESS_LINE_REGEX).optional(),
  city: Joi.string().regex(CITY_REGEX).optional(),
  country: Joi.string().valid("Canada", "United States").optional(),
  postalCodeCanada: Joi.string().regex(POSTAL_CODE_CANADA_REGEX).optional(),
  postalCodeUS: Joi.string().regex(POSTAL_CODE_US_REGEX).optional(),
  province: Joi.string().optional(),
  state: Joi.string().optional(),
  storeLocation: Joi.string().optional(),
  department: Joi.string().optional(),
  firstName: Joi.string().regex(FULL_NAME_REGEX).optional(),
  lastName: Joi.string().regex(FULL_NAME_REGEX).optional(),
  jobPosition: Joi.string().optional(),
  profilePictureUrl: Joi.string().optional(),
  roles: Joi.array().items(Joi.string().regex(USER_ROLES_REGEX)).optional(),
});

export { createUserJoiSchema, updateUserJoiSchema };
