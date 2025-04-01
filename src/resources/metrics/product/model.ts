import { model, Schema } from "mongoose";
import type {
    AllStoreLocations,
    ProductCategory,
    ProductYearlyMetric,
} from "../types";

type ProductMetricSchema = {
    storeLocation: AllStoreLocations;
    name: ProductCategory | "All Products";
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
        storeLocation: {
            type: String,
            default: "All Locations",
            required: [true, "Store location is required"],
        },
        name: {
            type: String,
            default: "All Products",
            required: [true, "Product category is required"],
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
