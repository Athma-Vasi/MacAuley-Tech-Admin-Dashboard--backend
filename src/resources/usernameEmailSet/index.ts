/**
 * This barrel index file is used to import/export usernameEmailSet model, router, types, handlers and services
 */

/**
 * Imports
 */
import { UsernameEmailSetModel } from "./model";
import { usernameEmailSetRouter } from "./routes";

import {
  updateUsernameEmailSetWithEmailService,
  updateUsernameEmailSetWithUsernameService,
} from "./services";

/**
 * Exports
 */
export {
  updateUsernameEmailSetWithEmailService,
  updateUsernameEmailSetWithUsernameService,
  UsernameEmailSetModel,
  usernameEmailSetRouter,
};
