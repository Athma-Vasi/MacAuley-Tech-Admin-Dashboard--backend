import { model, Schema, type Types } from "mongoose";
import type { AllStoreLocations, ProductMetric } from "../types";

type ProductMetricsSchema = {
    storeLocation: AllStoreLocations;
    productMetrics: ProductMetric[];
};

type ProductMetricsDocument = ProductMetricsSchema & {
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    __v: number;
};

const productMetricsSchema = new Schema(
    {
        storeLocation: {
            type: String,
            default: "All Locations",
            required: [true, "Store location is required"],
        },
        productMetrics: [
            {
                name: {
                    type: String,
                    required: [true, "Product name is required"],
                },

                yearlyMetrics: [
                    {
                        year: {
                            type: String,
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
        ],
    },
    { timestamps: true },
);

productMetricsSchema.index({ storeLocation: "text" });

const ProductMetricModel = model<ProductMetricsDocument>(
    "ProductMetric",
    productMetricsSchema,
);

export { ProductMetricModel };
export type { ProductMetricsDocument, ProductMetricsSchema };
