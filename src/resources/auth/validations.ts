import Joi from "joi";
import { PASSWORD_REGEX, USERNAME_REGEX } from "../../regex";

const createAuthSessionJoiSchema = Joi.object({
    username: Joi.string().regex(USERNAME_REGEX).required(),
    password: Joi.string().regex(PASSWORD_REGEX).required(),
});

const logoutAuthSessionJoiSchema = Joi.object({
    sessionId: Joi.string().required(),
});

export { createAuthSessionJoiSchema, logoutAuthSessionJoiSchema };
