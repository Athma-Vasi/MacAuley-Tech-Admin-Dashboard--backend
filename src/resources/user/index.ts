/**
 * This barrel file is used to import/export user model, router, types, handlers and services
 */

/**
 * Imports
 */
import { UserModel } from "./model";
import { userRouter } from "./routes";

import type {
  Country,
  Department,
  JobPosition,
  PhoneNumber,
  PostalCode,
  Province,
  StatesUS,
  UserDocument,
  UserRoles,
  UserSchema,
} from "./model";

/**
 * Exports
 */
export { UserModel, userRouter };
export type {
  Country,
  Department,
  JobPosition,
  PhoneNumber,
  PostalCode,
  Province,
  StatesUS,
  UserDocument,
  UserRoles,
  UserSchema,
};
