import Joi from "joi";
import {
    ALL_STORE_LOCATIONS_REGEX,
    DAYS_REGEX,
    MONTHS_REGEX,
    PRODUCT_CATEGORY_REGEX,
    YEARS_REGEX,
} from "../../../regex";

const rusJoiSchema = Joi.object({
    total: Joi.number().default(0),
    online: Joi.number().default(0),
    inStore: Joi.number().default(0),
});

const createProductMetricsJoiSchema = Joi.object({
    storeLocation: Joi.string().regex(ALL_STORE_LOCATIONS_REGEX).required(),
    metricCategory: Joi.string().regex(PRODUCT_CATEGORY_REGEX),
    yearlyMetrics: Joi.array().items(
        Joi.object({
            year: Joi.string().regex(YEARS_REGEX).required(),
            revenue: rusJoiSchema.required(),
            unitsSold: rusJoiSchema.required(),
            monthlyMetrics: Joi.array().items(
                Joi.object({
                    month: Joi.string().regex(MONTHS_REGEX).required(),
                    revenue: rusJoiSchema.required(),
                    unitsSold: rusJoiSchema.required(),
                    dailyMetrics: Joi.array().items(
                        Joi.object({
                            day: Joi.string().regex(DAYS_REGEX)
                                .required(),
                            revenue: rusJoiSchema.required(),
                            unitsSold: rusJoiSchema.required(),
                        }),
                    ).optional(),
                }),
            ).optional(),
        }),
    ).optional(),
});

const updateProductMetricsJoiSchema = Joi.object({
    storeLocation: Joi.string().regex(ALL_STORE_LOCATIONS_REGEX).optional(),
    metricCategory: Joi.string().regex(PRODUCT_CATEGORY_REGEX).optional(),
    yearlyMetrics: Joi.array().items(
        Joi.object({
            year: Joi.string().regex(YEARS_REGEX).optional(),
            revenue: Joi.object({
                total: Joi.number().optional(),
                online: Joi.number().optional(),
                inStore: Joi.number().optional(),
            }).optional(),
            unitsSold: Joi.object({
                total: Joi.number().optional(),
                online: Joi.number().optional(),
                inStore: Joi.number().optional(),
            }).optional(),
            monthlyMetrics: Joi.array().items(
                Joi.object({
                    month: Joi.string().regex(MONTHS_REGEX).optional(),
                    revenue: Joi.object({
                        total: Joi.number().optional(),
                        online: Joi.number().optional(),
                        inStore: Joi.number().optional(),
                    }).optional(),
                    unitsSold: Joi.object({
                        total: Joi.number().optional(),
                        online: Joi.number().optional(),
                        inStore: Joi.number().optional(),
                    }).optional(),
                    dailyMetrics: Joi.array().items(
                        Joi.object({
                            day: Joi.string().regex(DAYS_REGEX)
                                .optional(),
                            revenue: Joi.object({
                                total: Joi.number().optional(),
                                online: Joi.number().optional(),
                                inStore: Joi.number().optional(),
                            }).optional(),
                            unitsSold: Joi.object({
                                total: Joi.number().optional(),
                                online: Joi.number().optional(),
                                inStore: Joi.number().optional(),
                            }).optional(),
                        }),
                    ).optional(),
                }),
            ).optional(),
        }),
    ).optional(),
});

export { createProductMetricsJoiSchema, updateProductMetricsJoiSchema };
