import { model, Schema, type Types } from "mongoose";
import type {
  AllStoreLocations,
  RepairCategory,
  RepairYearlyMetric,
} from "../types";

type RepairMetricsSchema = {
  metricCategory: RepairCategory | "All Repairs";
  storeLocation: AllStoreLocations;
  yearlyMetrics: RepairYearlyMetric[];
};

type RepairMetricsDocument = RepairMetricsSchema & {
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
    metricCategory: {
      type: String,
      default: "All Repairs",
      required: [true, "Metric category is required"],
    },

    yearlyMetrics: [{
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
    }],
  },
  { timestamps: true },
);

repairMetricsSchema.index({
  storeLocation: "text",
});

const RepairMetricsModel = model<RepairMetricsDocument>(
  "RepairMetrics",
  repairMetricsSchema,
);

export { RepairMetricsModel };
export type { RepairMetricsDocument, RepairMetricsSchema };
