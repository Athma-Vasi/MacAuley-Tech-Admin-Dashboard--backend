/**
 * This barrel file is used to import/export errorLog model, router, types, handlers and services
 */

/**
 * Imports
 */
import { ErrorLogModel } from "./model";
import { errorLogRouter } from "./routes";

import type { ErrorLogDocument, ErrorLogSchema } from "./model";

/**
 * Exports
 */
export { ErrorLogModel, errorLogRouter };

export type { ErrorLogDocument, ErrorLogSchema };
