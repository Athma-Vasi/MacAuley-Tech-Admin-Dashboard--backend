import { model, Schema, type Types } from "mongoose";
import type { AllStoreLocations, YearlyFinancialMetric } from "../types";

type FinancialMetricsSchema = {
    storeLocation: AllStoreLocations;
    financialMetrics: YearlyFinancialMetric[];
};

type FinancialMetricsDocument = FinancialMetricsSchema & {
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    __v: number;
};

const pertSchema = {
    total: {
        type: Number,
        default: 0,
    },
    repair: {
        type: Number,
        default: 0,
    },
    sales: {
        total: {
            type: Number,
            default: 0,
        },
        inStore: {
            type: Number,
            default: 0,
        },
        online: {
            type: Number,
            default: 0,
        },
    },
};

const financialMetricsSchema = new Schema(
    {
        storeLocation: {
            type: String,
            default: "All Locations",
            required: [true, "Store location is required"],
        },
        financialMetrics: [
            {
                year: {
                    type: String,
                    required: [true, "Year is required"],
                },
                averageOrderValue: {
                    type: Number,
                    default: 0,
                },
                conversionRate: {
                    type: Number,
                    default: 0,
                },
                netProfitMargin: {
                    type: Number,
                    default: 0,
                },
                expenses: pertSchema,
                profit: pertSchema,
                revenue: pertSchema,
                transactions: pertSchema,
                monthlyMetrics: [
                    {
                        month: {
                            type: String, // Month: like "January", "February", etc.
                            required: [true, "Month is required"],
                        },
                        averageOrderValue: {
                            type: Number,
                            default: 0,
                        },
                        conversionRate: {
                            type: Number,
                            default: 0,
                        },
                        netProfitMargin: {
                            type: Number,
                            default: 0,
                        },
                        expenses: pertSchema,
                        profit: pertSchema,
                        revenue: pertSchema,
                        transactions: pertSchema,
                        dailyMetrics: [
                            {
                                day: {
                                    type: String, // Day: like "01", "02", etc.
                                    required: [true, "Day is required"],
                                },
                                averageOrderValue: {
                                    type: Number,
                                    default: 0,
                                },
                                conversionRate: {
                                    type: Number,
                                    default: 0,
                                },
                                netProfitMargin: {
                                    type: Number,
                                    default: 0,
                                },
                                expenses: pertSchema,
                                profit: pertSchema,
                                revenue: pertSchema,
                                transactions: pertSchema,
                            },
                        ],
                    },
                ],
            },
        ],
    },
    { timestamps: true },
);

financialMetricsSchema.index({ storeLocation: "text" });

const FinancialMetricsModel = model<FinancialMetricsDocument>(
    "FinancialMetrics",
    financialMetricsSchema,
);

export { FinancialMetricsModel };
export type { FinancialMetricsDocument, FinancialMetricsSchema };
