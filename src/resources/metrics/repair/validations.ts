import Joi from "joi";
import {
  ALL_STORE_LOCATIONS_REGEX,
  DAYS_REGEX,
  MONTHS_REGEX,
  REPAIR_CATEGORY_REGEX,
  YEARS_REGEX,
} from "../../../regex";

const createRepairMetricsJoiSchema = Joi.object({
  storeLocation: Joi.string().regex(ALL_STORE_LOCATIONS_REGEX).required(),
  metricCategory: Joi.string().regex(REPAIR_CATEGORY_REGEX).required(),
  yearlyMetrics: Joi.array().items(
    Joi.object({
      year: Joi.string().regex(YEARS_REGEX).required(),
      revenue: Joi.number().required(),
      unitsRepaired: Joi.number().required(),
      monthlyMetrics: Joi.array().items(
        Joi.object({
          month: Joi.string().regex(MONTHS_REGEX)
            .required(),
          revenue: Joi.number().required(),
          unitsRepaired: Joi.number().required(),
          dailyMetrics: Joi.array().items(
            Joi.object({
              day: Joi.string().regex(DAYS_REGEX)
                .required(),
              revenue: Joi.number().required(),
              unitsRepaired: Joi.number().required(),
            }),
          ),
        }),
      ),
    }),
  ),
});

const updateRepairMetricsJoiSchema = Joi.object({
  storeLocation: Joi.string().regex(ALL_STORE_LOCATIONS_REGEX).optional(),
  metricCategory: Joi.string().regex(REPAIR_CATEGORY_REGEX).optional(),
  yearlyMetrics: Joi.array().items(
    Joi.object({
      year: Joi.string().regex(YEARS_REGEX).optional(),
      revenue: Joi.number().optional(),
      unitsRepaired: Joi.number().optional(),
      monthlyMetrics: Joi.array().items(
        Joi.object({
          month: Joi.string().regex(MONTHS_REGEX)
            .optional(),
          revenue: Joi.number().optional(),
          unitsRepaired: Joi.number().optional(),
          dailyMetrics: Joi.array().items(
            Joi.object({
              day: Joi.string().regex(DAYS_REGEX)
                .optional(),
              revenue: Joi.number().optional(),
              unitsRepaired: Joi.number().optional(),
            }),
          ).optional(),
        }),
      ).optional(),
    }),
  ).optional(),
});

export { createRepairMetricsJoiSchema, updateRepairMetricsJoiSchema };
