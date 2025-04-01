import Joi from "joi";
import {
    ALL_STORE_LOCATIONS_REGEX,
    DAYS_REGEX,
    MONTHS_REGEX,
    PRODUCT_CATEGORY_REGEX,
    YEARS_REGEX,
} from "../../../regex";

/**
 * type ProductMetricSchema = {
    expireAt: Date;
    name: ProductCategory | "All Products";
    storeLocation: AllStoreLocations;
    userId: string;
    yearlyMetrics: ProductYearlyMetric[];
};

type ProductMetricDocument = ProductMetricSchema & {
    _id: string;
    createdAt: Date;
    updatedAt: Date;
    __v: number;
};

const productMetricSchema = new Schema(
    {
        expireAt: {
            type: Date,
            required: false,
            default: Date.now,
            index: { expires: "12h" }, // document will expire in 12 hours
        },
        name: {
            type: String,
            default: "All Products",
            required: [true, "Product category is required"],
        },
        storeLocation: {
            type: String,
            default: "All Locations",
            required: [true, "Store location is required"],
        },
        userId: {
            type: String,
            required: [true, "User ID is required"],
            ref: "User",
            index: true,
        },
        yearlyMetrics: [
            {
                year: {
                    type: Number,
                    required: [true, "Year is required"],
                },
                revenue: {
                    online: {
                        type: Number,
                        default: 0,
                    },
                    inStore: {
                        type: Number,
                        default: 0,
                    },
                },
                unitsSold: {
                    online: {
                        type: Number,
                        default: 0,
                    },
                    inStore: {
                        type: Number,
                        default: 0,
                    },
                },
                monthlyMetrics: [
                    {
                        month: {
                            type: String, // Month: like "January", "February", etc.
                            required: [true, "Month is required"],
                        },
                        revenue: {
                            online: {
                                type: Number,
                                default: 0,
                            },
                            inStore: {
                                type: Number,
                                default: 0,
                            },
                        },
                        unitsSold: {
                            online: {
                                type: Number,
                                default: 0,
                            },
                            inStore: {
                                type: Number,
                                default: 0,
                            },
                        },
                        dailyMetrics: [
                            {
                                day: {
                                    type: String,
                                    required: [true, "Day is required"],
                                },
                                revenue: {
                                    online: {
                                        type: Number,
                                        default: 0,
                                    },
                                    inStore: {
                                        type: Number,
                                        default: 0,
                                    },
                                },
                                unitsSold: {
                                    online: {
                                        type: Number,
                                        default: 0,
                                    },
                                    inStore: {
                                        type: Number,
                                        default: 0,
                                    },
                                },
                            },
                        ],
                    },
                ],
            },
        ],
    },
    { timestamps: true },
);
 */

const createProductMetricsJoiSchema = Joi.object({
    expireAt: Joi.date().optional(),
    name: Joi.string().regex(PRODUCT_CATEGORY_REGEX).required(),
    storeLocation: Joi.string().regex(ALL_STORE_LOCATIONS_REGEX).required(),
    userId: Joi.string().required(),
    yearlyMetrics: Joi.array().items(
        Joi.object({
            year: Joi.string().regex(YEARS_REGEX).required(),
            revenue: Joi.object({
                online: Joi.number().default(0),
                inStore: Joi.number().default(0),
            }).required(),
            unitsSold: Joi.object({
                online: Joi.number().default(0),
                inStore: Joi.number().default(0),
            }).required(),
            monthlyMetrics: Joi.array().items(
                Joi.object({
                    month: Joi.string().regex(MONTHS_REGEX).required(),
                    revenue: Joi.object({
                        online: Joi.number().default(0),
                        inStore: Joi.number().default(0),
                    }).required(),
                    unitsSold: Joi.object({
                        online: Joi.number().default(0),
                        inStore: Joi.number().default(0),
                    }).required(),
                    dailyMetrics: Joi.array().items(
                        Joi.object({
                            day: Joi.string().regex(DAYS_REGEX).required(),
                            revenue: Joi.object({
                                online: Joi.number().default(0),
                                inStore: Joi.number().default(0),
                            }).required(),
                            unitsSold: Joi.object({
                                online: Joi.number().default(0),
                                inStore: Joi.number().default(0),
                            }).required(),
                        }),
                    ).optional(),
                }),
            ).optional(),
        }),
    ).optional(),
});

export { createProductMetricsJoiSchema };
