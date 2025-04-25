import Joi from "joi";
import {
  ALL_STORE_LOCATIONS_REGEX,
  DAYS_REGEX,
  MONTHS_REGEX,
  STORE_LOCATION_REGEX,
  YEARS_REGEX,
} from "../../../regex";

const pertJoiSchema = Joi.object({
  total: Joi.number().default(0),
  repair: Joi.number().default(0),
  sales: Joi.object({
    total: Joi.number().default(0),
    inStore: Joi.number().default(0),
    online: Joi.number().default(0),
  }),
}).required();

const createFinancialMetricsJoiSchema = Joi.object({
  storeLocation: Joi.string().regex(ALL_STORE_LOCATIONS_REGEX).required(),
  financialMetrics: Joi.array()
    .items(
      Joi.object({
        year: Joi.string().regex(YEARS_REGEX).required(),
        averageOrderValue: Joi.number().required(),
        conversionRate: Joi.number().required(),
        netProfitMargin: Joi.number().required(),
        expenses: pertJoiSchema,
        profit: pertJoiSchema,
        revenue: pertJoiSchema,
        transactions: pertJoiSchema,
        monthlyMetrics: Joi.array().items(
          Joi.object({
            month: Joi.string().regex(MONTHS_REGEX).required(),
            averageOrderValue: Joi.number().required(),
            conversionRate: Joi.number().required(),
            netProfitMargin: Joi.number().required(),
            expenses: pertJoiSchema,
            profit: pertJoiSchema,
            revenue: pertJoiSchema,
            transactions: pertJoiSchema,
            dailyMetrics: Joi.array().items(
              Joi.object({
                day: Joi.string().regex(DAYS_REGEX).required(),
                averageOrderValue: Joi.number().required(),
                conversionRate: Joi.number().required(),
                netProfitMargin: Joi.number().required(),
                expenses: pertJoiSchema,
                profit: pertJoiSchema,
                revenue: pertJoiSchema,
                transactions: pertJoiSchema,
              }),
            ),
          }),
        ),
      }),
    )
    .required(),
}).required();

const updateFinancialMetricsJoiSchema = Joi.object({
  storeLocation: Joi.string().regex(STORE_LOCATION_REGEX).optional(),
  financialMetrics: Joi.array()
    .items(
      Joi.object({
        year: Joi.string().regex(YEARS_REGEX).optional(),
        averageOrderValue: Joi.number().optional(),
        conversionRate: Joi.number().optional(),
        netProfitMargin: Joi.number().optional(),
        expenses: pertJoiSchema.optional(),
        profit: pertJoiSchema.optional(),
        revenue: pertJoiSchema.optional(),
        transactions: pertJoiSchema.optional(),
        monthlyMetrics: Joi.array().items(
          Joi.object({
            month: Joi.string().regex(MONTHS_REGEX).optional(),
            averageOrderValue: Joi.number().optional(),
            conversionRate: Joi.number().optional(),
            netProfitMargin: Joi.number().optional(),
            expenses: pertJoiSchema.optional(),
            profit: pertJoiSchema.optional(),
            revenue: pertJoiSchema.optional(),
            transactions: pertJoiSchema.optional(),
            dailyMetrics: Joi.array().items(
              Joi.object({
                day: Joi.string().regex(DAYS_REGEX).optional(),
                averageOrderValue: Joi.number().optional(),
                conversionRate: Joi.number().optional(),
                netProfitMargin: Joi.number().optional(),
                expenses: pertJoiSchema.optional(),
                profit: pertJoiSchema.optional(),
                revenue: pertJoiSchema.optional(),
                transactions: pertJoiSchema.optional(),
              }),
            ).optional(),
          }),
        ).optional(),
      }),
    )
    .optional(),
}).required();

export { createFinancialMetricsJoiSchema, updateFinancialMetricsJoiSchema };
