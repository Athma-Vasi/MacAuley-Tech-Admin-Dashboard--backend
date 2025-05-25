import Joi from "joi";
import { USER_ROLES_REGEX } from "../regex";

const requestBodyAfterJWTVerificationJoiSchema = Joi.object({
    accessToken: Joi.string().required(),
    sessionId: Joi.string().required(),
    userId: Joi.string().required(),
    username: Joi.string().required(),
    roles: Joi.array().items(Joi.string().regex(USER_ROLES_REGEX)).required(),
});

const requestBodyAfterQueryParsingJoiSchema = Joi.object({
    accessToken: Joi.string().required(),
    sessionId: Joi.string().required(),
    userId: Joi.string().required(),
    username: Joi.string().required(),
    roles: Joi.array().items(Joi.string().regex(USER_ROLES_REGEX)).required(),
    newQueryFlag: Joi.boolean().default(false),
    totalDocuments: Joi.number().default(0),
});

const requestQueryAfterQueryParsingJoiSchema = Joi.object({
    projection: Joi.array().items(Joi.string()),
    filter: Joi.object({}),
    options: Joi.object({}),
});

const requestAfterQueryParsingJoiSchema = Joi.object({
    body: requestBodyAfterQueryParsingJoiSchema,
    query: requestQueryAfterQueryParsingJoiSchema,
});

export {
    requestAfterQueryParsingJoiSchema,
    requestBodyAfterJWTVerificationJoiSchema,
    requestBodyAfterQueryParsingJoiSchema,
    requestQueryAfterQueryParsingJoiSchema,
};
