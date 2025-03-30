import Joi from "joi";
import { PASSWORD_REGEX, USER_ROLES_REGEX, USERNAME_REGEX } from "../../regex";

const createUserJoiSchema = Joi.object({
  username: Joi.string().regex(USERNAME_REGEX).required(),
  password: Joi.string().regex(PASSWORD_REGEX).required(),
  email: Joi.string().email().required(),
  roles: Joi.array().items(Joi.string().regex(USER_ROLES_REGEX)).required(),
});

const updateUserJoiSchema = Joi.object({
  username: Joi.string().regex(USERNAME_REGEX).optional(),
  password: Joi.string().regex(PASSWORD_REGEX).optional(),
  email: Joi.string().email().optional(),
  roles: Joi.array().items(Joi.string().regex(USER_ROLES_REGEX)).optional(),
});

export { createUserJoiSchema, updateUserJoiSchema };
