import { model, Schema } from "mongoose";
import type {
    AllStoreLocations,
    ProductCategory,
    ProductYearlyMetric,
} from "../types";

type ProductMetricSchema = {
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

productMetricSchema.index({ storeLocation: "text" });
productMetricSchema.index({ productMetrics: "text" });

const ProductMetricModel = model<ProductMetricDocument>(
    "ProductMetric",
    productMetricSchema,
);

export { ProductMetricModel };
export type { ProductMetricDocument, ProductMetricSchema };
