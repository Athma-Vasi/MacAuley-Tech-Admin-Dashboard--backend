/**
 * This barrel file is used to import/export auth model, router, types, handlers and services
 */

import { authRouter } from "./routes";
/**
 * Imports
 */
import {
  loginUserHandler,
  logoutUserHandler,
  registerUserHandler,
} from "./handlers";
import { type AuthDocument, AuthModel, type AuthSchema } from "./model";
import { createTokenService } from "./services";
/**
 * Exports
 */
export {
  AuthModel,
  authRouter,
  createTokenService,
  loginUserHandler,
  logoutUserHandler,
  registerUserHandler,
};

export type { AuthDocument, AuthSchema };
