import { model, Schema, type Types } from "mongoose";
import type { AllStoreLocations, RepairMetric } from "../types";

type RepairMetricSchema = {
    storeLocation: AllStoreLocations;
    repairMetrics: RepairMetric[];
};

type RepairMetricDocument = RepairMetricSchema & {
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    __v: number;
};

const repairMetricsSchema = new Schema(
    {
        storeLocation: {
            type: String,
            default: "All Locations",
            required: [true, "Store location is required"],
        },
        repairMetrics: [
            {
                name: {
                    type: String,
                    required: [true, "Repair name is required"],
                },
                yearlyMetrics: [
                    {
                        year: {
                            type: String,
                            required: [true, "Year is required"],
                        },
                        revenue: {
                            type: Number,
                            default: 0,
                        },
                        unitsRepaired: {
                            type: Number,
                            default: 0,
                        },
                        monthlyMetrics: [
                            {
                                month: {
                                    type: String, // Month: like "January", "February", etc.
                                    required: [true, "Month is required"],
                                },
                                revenue: {
                                    type: Number,
                                    default: 0,
                                },
                                unitsRepaired: {
                                    type: Number,
                                    default: 0,
                                },
                                dailyMetrics: [
                                    {
                                        day: {
                                            type: String, // Day: like "01", "02", etc.
                                            required: [true, "Day is required"],
                                        },
                                        revenue: {
                                            type: Number,
                                            default: 0,
                                        },
                                        unitsRepaired: {
                                            type: Number,
                                            default: 0,
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

repairMetricsSchema.index({
    storeLocation: "text",
});

const RepairMetricsModel = model<RepairMetricDocument>(
    "RepairMetrics",
    repairMetricsSchema,
);

export { RepairMetricsModel };
export type { RepairMetricDocument, RepairMetricSchema };
