import Joi from "joi";
import {
    DAYS_REGEX,
    MONTHS_REGEX,
    STORE_LOCATION_REGEX,
    YEARS_REGEX,
} from "../../../regex";

const customersJoiSchema = Joi.object({
    churnRate: Joi.number().default(0),
    retentionRate: Joi.number().default(0),
    new: Joi.object({
        total: Joi.number().default(0),
        repair: Joi.number().default(0),
        sales: Joi.object({
            inStore: Joi.number().default(0),
            online: Joi.number().default(0),
            total: Joi.number().default(0),
        }),
    }),
    returning: Joi.object({
        total: Joi.number().default(0),
        repair: Joi.number().default(0),
        sales: Joi.object({
            inStore: Joi.number().default(0),
            online: Joi.number().default(0),
            total: Joi.number().default(0),
        }),
    }),
    total: Joi.number().default(0),
});

const createCustomerMetricsJoiSchema = Joi.object({
    storeLocation: Joi.string().regex(STORE_LOCATION_REGEX).default(
        "All Locations",
    ),
    customerMetrics: Joi.object({
        lifetimeValue: Joi.number().default(0),
        totalCustomers: Joi.number().default(0),
        yearlyMetrics: Joi.array()
            .items(
                Joi.object({
                    year: Joi.string().regex(YEARS_REGEX).required(),
                    customers: customersJoiSchema,
                    monthlyMetrics: Joi.array()
                        .items(
                            Joi.object({
                                month: Joi.string().regex(MONTHS_REGEX)
                                    .required(),
                                customers: customersJoiSchema,
                                dailyMetrics: Joi.array()
                                    .items(
                                        Joi.object({
                                            day: Joi.string().regex(
                                                DAYS_REGEX,
                                            )
                                                .required(),
                                            customers: customersJoiSchema,
                                        }),
                                    ).required(),
                            }),
                        ).required(),
                }),
            ).required(),
    }),
});

const updateCustomerMetricsJoiSchema = Joi.object({
    storeLocation: Joi.string().regex(STORE_LOCATION_REGEX).default(
        "All Locations",
    ),
    customerMetrics: Joi.object({
        lifetimeValue: Joi.number().default(0),
        totalCustomers: Joi.number().default(0),
        yearlyMetrics: Joi.array()
            .items(
                Joi.object({
                    year: Joi.string().regex(YEARS_REGEX).optional(),
                    customers: customersJoiSchema,
                    monthlyMetrics: Joi.array()
                        .items(
                            Joi.object({
                                month: Joi.string().regex(MONTHS_REGEX)
                                    .optional(),
                                customers: customersJoiSchema,
                                dailyMetrics: Joi.array()
                                    .items(
                                        Joi.object({
                                            day: Joi.string().regex(
                                                DAYS_REGEX,
                                            )
                                                .optional(),
                                            customers: customersJoiSchema,
                                        }),
                                    ).optional(),
                            }),
                        ).optional(),
                }),
            ).optional(),
    }),
});

export { createCustomerMetricsJoiSchema, updateCustomerMetricsJoiSchema };
