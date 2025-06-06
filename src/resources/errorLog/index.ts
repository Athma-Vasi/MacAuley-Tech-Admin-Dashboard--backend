/**
 * This barrel file is used to import/export errorLog model, router, types, handlers and services
 */

/**
 * Imports
 */
import type { ErrorLogDocument, ErrorLogSchema } from "./model";
import { ErrorLogModel } from "./model";
import { errorLogRouter } from "./routes";

/**
 * Exports
 */
export { ErrorLogModel, errorLogRouter };

export type { ErrorLogDocument, ErrorLogSchema };
