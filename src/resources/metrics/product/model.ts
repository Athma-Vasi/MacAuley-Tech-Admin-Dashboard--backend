import { model, Schema, type Types } from "mongoose";
import type {
    AllStoreLocations,
    ProductCategory,
    ProductYearlyMetric,
} from "../types";

type ProductMetricsSchema = {
    metricCategory: ProductCategory | "All Products";
    storeLocation: AllStoreLocations;
    yearlyMetrics: ProductYearlyMetric[];
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
        metricCategory: {
            type: String,
            default: "All Products",
            required: [true, "Metric category is required"],
        },
        yearlyMetrics: [{
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
        }],
    },
    { timestamps: true },
);

productMetricsSchema.index({ storeLocation: "text", metricCategory: "text" });

const ProductMetricsModel = model<ProductMetricsDocument>(
    "ProductMetric",
    productMetricsSchema,
);

export { ProductMetricsModel };
export type { ProductMetricsDocument, ProductMetricsSchema };
