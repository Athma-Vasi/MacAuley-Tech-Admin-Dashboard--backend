import Joi from "joi";
import { USERNAME_REGEX } from "../../regex";

const createUsernameEmailSetJoiSchema = Joi.object({
  username: Joi.array().items(Joi.string().regex(USERNAME_REGEX).required())
    .required(),
  email: Joi.array().items(Joi.string().email().required()).required(),
});

const updateUsernameEmailSetJoiSchema = Joi.object({
  username: Joi.array().items(Joi.string().regex(USERNAME_REGEX).optional())
    .optional(),
  email: Joi.array().items(Joi.string().email().optional()).optional(),
});

export { createUsernameEmailSetJoiSchema, updateUsernameEmailSetJoiSchema };
