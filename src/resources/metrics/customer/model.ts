import { model, Schema, type Types } from "mongoose";
import type { AllStoreLocations, CustomerMetrics } from "../types";

type CustomerMetricsSchema = {
  storeLocation: AllStoreLocations;
  customerMetrics: CustomerMetrics[];
};

type CustomerMetricsDocument = CustomerMetricsSchema & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
};

const newReturningSchema = {
  repair: {
    type: Number,
    default: 0,
  },
  sales: {
    inStore: {
      type: Number,
      default: 0,
    },
    online: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
  },
};

const customersSchema = {
  churnRate: {
    type: Number,
    default: 0,
  },
  retentionRate: {
    type: Number,
    default: 0,
  },
  new: newReturningSchema,
  returning: newReturningSchema,
  total: {
    type: Number,
    default: 0,
  },
};

const customerMetricsSchema = new Schema(
  {
    storeLocation: {
      type: String,
      default: "All Locations",
      required: [true, "Store location is required"],
    },
    customerMetrics: [
      {
        lifetimeValue: {
          type: Number,
          default: 0,
        },
        totalCustomers: {
          type: Number,
          default: 0,
        },

        yearlyMetrics: [
          {
            year: {
              type: String, // Year: like "2023", "2024", etc.
              required: [true, "Year is required"],
            },
            customers: structuredClone(customersSchema),

            monthlyMetrics: [
              {
                month: {
                  type: String, // Month: like "January", "February", etc.
                  required: [true, "Month is required"],
                },
                customers: structuredClone(customersSchema),

                dailyMetrics: [
                  {
                    day: {
                      type: String, // Day: like "01", "02", etc.
                      required: [true, "Day is required"],
                    },
                    customers: structuredClone(
                      customersSchema,
                    ),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  },
);

customerMetricsSchema.index({ storeLocation: "text" });

const CustomerMetricsModel = model<
  CustomerMetricsDocument
>(
  "CustomerMetrics",
  customerMetricsSchema,
);

export { CustomerMetricsModel };
export type { CustomerMetricsDocument, CustomerMetricsSchema };
