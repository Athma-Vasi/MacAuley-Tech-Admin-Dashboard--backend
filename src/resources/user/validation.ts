import Joi from "joi";
import {
  DEPARTMENT_REGEX,
  FULL_NAME_REGEX,
  JOB_POSITION_REGEX,
  NAME_REGEX,
  PASSWORD_REGEX,
  PHONE_NUMBER_REGEX,
  USER_ROLES_REGEX,
  USERNAME_REGEX,
} from "../../regex";
import { ADDRESS_SCHEMA } from "../customer/customer.validation";

const createUserJoiSchema = Joi.object({
  username: Joi.string().regex(USERNAME_REGEX).required(),
  password: Joi.string().regex(PASSWORD_REGEX).required(),
  email: Joi.string().email().required(),

  firstName: Joi.string().regex(NAME_REGEX).required(),
  middleName: Joi.string().regex(NAME_REGEX).required(),
  lastName: Joi.string().regex(NAME_REGEX).required(),
  preferredName: Joi.string().regex(NAME_REGEX).required(),
  profilePictureUrl: Joi.string().uri().required(),
  dateOfBirth: Joi.date().required(),

  contactNumber: Joi.string().regex(PHONE_NUMBER_REGEX).required(),
  address: ADDRESS_SCHEMA.required(),

  jobPosition: Joi.string().regex(JOB_POSITION_REGEX).required(),
  department: Joi.string().regex(DEPARTMENT_REGEX).required(),
  storeLocation: Joi.string().optional().allow(null),

  emergencyContact: Joi.object({
    fullName: Joi.string().regex(FULL_NAME_REGEX).required(),
    contactNumber: Joi.string().regex(PHONE_NUMBER_REGEX).required(),
  }).required(),
  startDate: Joi.date().required(),
  roles: Joi.string().regex(USER_ROLES_REGEX).required(),
  active: Joi.boolean().required(),

  completedSurveys: Joi.array().items(Joi.string()).required(),
  isPrefersReducedMotion: Joi.boolean().required(),
});

const updateUserJoiSchema = Joi.object({
  username: Joi.string().regex(USERNAME_REGEX).optional(),
  password: Joi.string().regex(PASSWORD_REGEX).optional(),
  email: Joi.string().email().optional(),

  firstName: Joi.string().regex(NAME_REGEX).optional(),
  middleName: Joi.string().regex(NAME_REGEX).optional(),
  lastName: Joi.string().regex(NAME_REGEX).optional(),
  preferredName: Joi.string().regex(NAME_REGEX).optional(),
  profilePictureUrl: Joi.string().uri().optional(),
  dateOfBirth: Joi.date().optional(),

  contactNumber: Joi.string().regex(PHONE_NUMBER_REGEX).optional(),
  address: ADDRESS_SCHEMA,

  jobPosition: Joi.string().regex(JOB_POSITION_REGEX).optional(),
  department: Joi.string().regex(DEPARTMENT_REGEX).optional(),
  storeLocation: Joi.string().optional().allow(null),

  emergencyContact: Joi.object({
    fullName: Joi.string().regex(FULL_NAME_REGEX).optional(),
    contactNumber: Joi.string().regex(PHONE_NUMBER_REGEX).optional(),
  }).optional(),
  startDate: Joi.date().optional(),
  roles: Joi.string().regex(USER_ROLES_REGEX).optional(),
  active: Joi.boolean().optional(),

  completedSurveys: Joi.array().items(Joi.string()).optional(),
  isPrefersReducedMotion: Joi.boolean().optional(),
});

export { createUserJoiSchema, updateUserJoiSchema };
