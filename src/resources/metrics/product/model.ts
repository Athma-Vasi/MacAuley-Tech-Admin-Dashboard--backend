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

const rusSchema = {
    total: {
        type: Number,
        default: 0,
    },
    online: {
        type: Number,
        default: 0,
    },
    inStore: {
        type: Number,
        default: 0,
    },
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
                        revenue: rusSchema,
                        unitsSold: rusSchema,
                        monthlyMetrics: [
                            {
                                month: {
                                    type: String, // Month: like "January", "February", etc.
                                    required: [true, "Month is required"],
                                },
                                revenue: rusSchema,
                                unitsSold: rusSchema,
                                dailyMetrics: [
                                    {
                                        day: {
                                            type: String,
                                            required: [true, "Day is required"],
                                        },
                                        revenue: rusSchema,
                                        unitsSold: rusSchema,
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

const ProductMetricsModel = model<ProductMetricsDocument>(
    "ProductMetric",
    productMetricsSchema,
);

export { ProductMetricsModel };
export type { ProductMetricsDocument, ProductMetricsSchema };
