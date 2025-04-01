import { toFixedFloat } from "../../utils";
import { DAYS_PER_MONTH, MONTHS } from "./constants";
import type {
  BusinessMetric,
  CustomerDailyMetric,
  CustomerMetrics,
  CustomerMonthlyMetric,
  CustomerYearlyMetric,
  DailyFinancialMetric,
  DaysInMonthsInYears,
  FinancialMetricCategories,
  LocationYearSpread,
  Month,
  MonthlyFinancialMetric,
  ProductCategory,
  ProductDailyMetric,
  ProductMetric,
  ProductMonthlyMetric,
  ProductYearlyMetric,
  RepairCategory,
  RepairDailyMetric,
  RepairMetric,
  RepairMonthlyMetric,
  RepairYearlyMetric,
  StoreLocation,
  Year,
  YearlyFinancialMetric,
} from "./types";

type ReturnDaysInMonthsInYearsInput = {
  daysPerMonth: number[];
  months: Month[];
  monthEnd?: number;
  monthStart?: number;
  storeLocation: StoreLocation | "All Locations";
  yearEnd?: number;
  yearStart?: number;
};
/**
 * Generate a map of days in months for a range of years.
 */
function returnDaysInMonthsInYears({
  daysPerMonth,
  months,
  monthEnd = 11,
  monthStart = 0,
  storeLocation,
  yearEnd = new Date().getFullYear(),
  yearStart = storeLocation === "Calgary"
    ? 2017
    : storeLocation === "Vancouver"
    ? 2019
    : 2013,
}: ReturnDaysInMonthsInYearsInput): DaysInMonthsInYears {
  const yearsRange = Array.from(
    { length: yearEnd - yearStart + 1 },
    (_, idx) => idx + yearStart,
  );

  return yearsRange.reduce<Map<Year, Map<Month, string[]>>>(
    (yearsAcc, year) => {
      const isCurrentYear = year === new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const slicedMonths = isCurrentYear
        ? months.slice(0, currentMonth + 1)
        : months.slice(monthStart, monthEnd + 1);

      const daysInMonthsMap = slicedMonths.reduce<Map<Month, string[]>>(
        (monthsAcc, month, monthIdx) => {
          const days = daysPerMonth[monthIdx];
          const isCurrentMonth = isCurrentYear &&
            monthIdx === currentMonth;
          const currentDay = isCurrentYear
            ? isCurrentMonth ? new Date().getDate() : days
            : days;

          const isLeapYear = (year % 4 === 0 && year % 100 !== 0) ||
            year % 400 === 0;
          const daysWithLeapYear = monthIdx === 1 && isLeapYear
            ? currentDay + 1
            : currentDay;

          const daysRange = Array.from(
            { length: daysWithLeapYear },
            (_, idx) => idx + 1,
          ).map((day) => day.toString().padStart(2, "0"));

          monthsAcc.set(month, daysRange);

          return monthsAcc;
        },
        new Map(),
      );

      yearsAcc.set(year.toString() as Year, daysInMonthsMap);

      return yearsAcc;
    },
    new Map(),
  );
}

type CreateRandomMetricsInput = {
  daysPerMonth: number[];
  months: Month[];
  productCategories: ProductCategory[];
  repairCategories: RepairCategory[];
  storeLocations: StoreLocation[];
};

async function createRandomBusinessMetrics({
  daysPerMonth,
  months,
  productCategories,
  repairCategories,
  storeLocations,
}: CreateRandomMetricsInput): Promise<BusinessMetric[]> {
  try {
    // financial metrics require product and repair metrics to be created first
    const incompleteBusinessMetrics = await Promise.all(
      storeLocations.map(async (storeLocation) => {
        const businessMetric: BusinessMetric = {
          storeLocation,
          customerMetrics: {
            totalCustomers: 0,
            lifetimeValue: 0,
            yearlyMetrics: [],
          },
          financialMetrics: [],
          productMetrics: [],
          repairMetrics: [],
        };

        // seed data containing the number of days in each month for each year
        const daysInMonthsInYears: DaysInMonthsInYears =
          returnDaysInMonthsInYears({
            daysPerMonth,
            months,
            storeLocation,
          });

        const [productMetrics, repairMetrics, customerMetrics] = await Promise
          .all([
            createRandomProductMetrics({
              daysInMonthsInYears,
              productCategories,
              storeLocation,
            }),
            createRandomRepairMetrics({
              daysInMonthsInYears,
              repairCategories,
              storeLocation,
            }),
            createRandomCustomerMetrics({
              daysInMonthsInYears,
              storeLocation,
            }),
          ]);

        // aggregate product and repair metrics into 'All Products' and 'All Repairs' metrics
        const [aggregatedProductMetrics, aggregatedRepairMetrics] =
          await Promise.all([
            createAggregatedProductMetrics(productMetrics),
            createAggregatedRepairMetrics(repairMetrics),
          ]);

        businessMetric.productMetrics = [
          aggregatedProductMetrics,
          ...productMetrics,
        ];
        businessMetric.repairMetrics = [
          aggregatedRepairMetrics,
          ...repairMetrics,
        ];
        businessMetric.customerMetrics = customerMetrics;

        return businessMetric;
      }),
    );

    // aggregate product, repair and customer metrics for each store location into a separate 'All Locations' store
    const [
      allLocationsAggregatedProductMetrics,
      allLocationsAggregatedRepairMetrics,
      allLocationsAggregatedCustomerMetrics,
    ] = await Promise.all([
      createAllLocationsAggregatedProductMetrics(
        incompleteBusinessMetrics,
      ),
      createAllLocationsAggregatedRepairMetrics(
        incompleteBusinessMetrics,
      ),
      createAllLocationsAggregatedCustomerMetrics(
        incompleteBusinessMetrics,
      ),
    ]);

    const allLocationsBusinessMetric: BusinessMetric = {
      storeLocation: "All Locations",
      customerMetrics: allLocationsAggregatedCustomerMetrics,
      financialMetrics: [],
      productMetrics: allLocationsAggregatedProductMetrics,
      repairMetrics: allLocationsAggregatedRepairMetrics,
    };

    const businessMetricsWithoutFinancials = [
      ...incompleteBusinessMetrics,
      allLocationsBusinessMetric,
    ];

    // use product and repair metrics in creating financial metrics
    const financialMetrics = await createRandomFinancialMetrics({
      businessMetrics: businessMetricsWithoutFinancials,
      storeLocations,
    });

    // empty 'All Locations' financial metrics atm
    const businessMetricsWithIncompleteFinancials = financialMetrics.reduce<
      BusinessMetric[]
    >((businessMetricsAcc, tuple) => {
      const [storeLocation, financialMetrics] = tuple as [
        StoreLocation,
        YearlyFinancialMetric[],
      ];

      const businessMetric = businessMetricsWithoutFinancials.find(
        (businessMetric) => businessMetric.storeLocation === storeLocation,
      );

      if (businessMetric) {
        businessMetric.financialMetrics = financialMetrics;
      }

      return businessMetricsAcc;
    }, businessMetricsWithoutFinancials);

    // aggregate financial metrics for each store location into 'All Locations' metrics
    const allLocationsAggregatedFinancialMetrics =
      createAllLocationsAggregatedFinancialMetrics(
        businessMetricsWithIncompleteFinancials,
      );

    const completeBusinessMetrics = businessMetricsWithIncompleteFinancials
      .map(
        (businessMetric) => {
          if (businessMetric.storeLocation === "All Locations") {
            businessMetric.financialMetrics =
              allLocationsAggregatedFinancialMetrics;
          }
          return businessMetric;
        },
      );

    return completeBusinessMetrics;
  } catch (error: any) {
    throw new Error("createRandomBusinessMetrics");
  }
}

/**
   *  productMetrics: {
      name: ProductCategory;

      yearlyMetrics: {
        year: string;
        unitsSold: {
          total: number;
          online: number;
          inStore: number;
        };
        revenue: {
          total: number;
          online: number;
          inStore: number;
        };

        monthlyMetrics: {
          month: string;
          unitsSold: {
            total: number;
            online: number;
            inStore: number;
          };
          revenue: {
            total: number;
            online: number;
            inStore: number;
          };

          dailyMetrics: {
            day: string;
            unitsSold: {
              total: number;
              online: number;
              inStore: number;
            };
            revenue: {
              total: number;
              online: number;
              inStore: number;
            };
          }[];
        }[];
      }[];
    }
   */

type CreateRandomProductMetricsInput = {
  daysInMonthsInYears: DaysInMonthsInYears;
  productCategories: ProductCategory[];
  storeLocation: StoreLocation;
};

async function createRandomProductMetrics({
  daysInMonthsInYears,
  productCategories,
  storeLocation,
}: CreateRandomProductMetricsInput): Promise<ProductMetric[]> {
  /**
   * ratio of online transactions to total transactions spread between [min, max] per year
   */
  const YEAR_ONLINE_TRANSACTIONS_SPREAD: LocationYearSpread = {
    Edmonton: {
      "2013": [0.15, 0.25],
      "2014": [0.2, 0.25],
      "2015": [0.25, 0.3],
      "2016": [0.3, 0.35],
      "2017": [0.35, 0.4],
      "2018": [0.4, 0.45],
      "2019": [0.45, 0.5],
      "2020": [0.65, 0.85],
      "2021": [0.65, 0.75],
      "2022": [0.65, 0.75],
      "2023": [0.67, 0.78],
      "2024": [0.65, 0.79],
      "2025": [0.65, 0.76],
    },
    Calgary: {
      "2017": [0.35, 0.4],
      "2018": [0.4, 0.45],
      "2019": [0.45, 0.5],
      "2020": [0.65, 0.85],
      "2021": [0.65, 0.75],
      "2022": [0.65, 0.75],
      "2023": [0.69, 0.79],
      "2024": [0.75, 0.77],
      "2025": [0.72, 0.76],
    },
    Vancouver: {
      "2019": [0.45, 0.5],
      "2020": [0.65, 0.85],
      "2021": [0.65, 0.75],
      "2022": [0.65, 0.75],
      "2023": [0.6, 0.7],
      "2024": [0.65, 0.75],
      "2025": [0.72, 0.76],
    },
  };

  /**
   * - random daily unitsSold spread between [min, max] per year
   */
  const YEAR_UNITS_SOLD_SPREAD: LocationYearSpread = {
    Edmonton: {
      "2013": [1, 2],
      "2014": [2, 3],
      "2015": [2, 5],
      "2016": [3, 7],
      "2017": [5, 9],
      "2018": [5, 11],
      "2019": [7, 13],
      "2020": [15, 17],
      "2021": [17, 19],
      "2022": [17, 19],
      "2023": [18, 21],
      "2024": [19, 22],
      "2025": [17, 22],
    },
    Calgary: {
      "2017": [1, 2],
      "2018": [2, 4],
      "2019": [3, 7],
      "2020": [7, 9],
      "2021": [9, 11],
      "2022": [9, 11],
      "2023": [10, 12],
      "2024": [11, 13],
      "2025": [10, 12],
    },
    Vancouver: {
      "2019": [1, 2],
      "2020": [3, 5],
      "2021": [5, 9],
      "2022": [5, 9],
      "2023": [6, 10],
      "2024": [7, 11],
      "2025": [8, 11],
    },
  };

  return await Promise.all(
    productCategories.map(async (productCategory) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const yearlyProductMetrics = Array.from(daysInMonthsInYears)
            .map(
              (yearTuple) => {
                const [year, daysInMonthsMap] = yearTuple;

                const monthlyProductMetrics = Array.from(
                  daysInMonthsMap,
                ).map(
                  (monthTuple) => {
                    const [month, daysRange] = monthTuple;

                    const dailyProductMetrics = daysRange
                      .map((day) => {
                        const [
                          dailyProductUnitsSold,
                          dailyProductSalesRevenue,
                        ] = createProductCategoryUnitsRevenueTuple(
                          {
                            productCategory,
                            storeLocation,
                            year,
                            yearUnitsSoldSpread: YEAR_UNITS_SOLD_SPREAD,
                          },
                        );

                        const randomOnlineFraction = createRandomNumber({
                          storeLocation,
                          year,
                          yearUnitsSpread: YEAR_ONLINE_TRANSACTIONS_SPREAD,
                          defaultMax: 0.3,
                          defaultMin: 0.1,
                          isFraction: true,
                        });

                        const dailyProductOnlineUnitsSold = Math.round(
                          dailyProductUnitsSold *
                            randomOnlineFraction,
                        );

                        const dailyProductInStoreUnitsSold = Math.round(
                          dailyProductUnitsSold -
                            dailyProductOnlineUnitsSold,
                        );

                        const dailyProductOnlineRevenue = Math.round(
                          dailyProductSalesRevenue *
                            randomOnlineFraction,
                        );

                        const dailyProductInStoreRevenue = Math.round(
                          dailyProductSalesRevenue -
                            dailyProductOnlineRevenue,
                        );

                        const dailyProductMetric: ProductDailyMetric = {
                          day,
                          unitsSold: {
                            inStore: dailyProductInStoreUnitsSold,
                            online: dailyProductOnlineUnitsSold,
                            total: dailyProductUnitsSold,
                          },
                          revenue: {
                            inStore: dailyProductInStoreRevenue,
                            online: dailyProductOnlineRevenue,
                            total: dailyProductSalesRevenue,
                          },
                        };

                        return dailyProductMetric;
                      });

                    const [
                      monthlyProductTotalUnitsSold,
                      monthlyProductOnlineUnitsSold,
                      monthlyProductInStoreUnitsSold,
                      monthlyProductTotalRevenue,
                      monthlyProductOnlineRevenue,
                      monthlyProductInStoreRevenue,
                    ] = dailyProductMetrics.reduce(
                      (
                        monthlyProductMetricsAcc,
                        dailyProductMetric,
                      ) => {
                        monthlyProductMetricsAcc[0] +=
                          dailyProductMetric.unitsSold
                            .total;
                        monthlyProductMetricsAcc[1] +=
                          dailyProductMetric.unitsSold
                            .online;
                        monthlyProductMetricsAcc[2] +=
                          dailyProductMetric.unitsSold
                            .inStore;
                        monthlyProductMetricsAcc[3] +=
                          dailyProductMetric.revenue
                            .total;
                        monthlyProductMetricsAcc[4] +=
                          dailyProductMetric.revenue
                            .online;
                        monthlyProductMetricsAcc[5] +=
                          dailyProductMetric.revenue
                            .inStore;

                        return monthlyProductMetricsAcc;
                      },
                      [0, 0, 0, 0, 0, 0],
                    );

                    const monthlyProductMetric: ProductMonthlyMetric = {
                      month,
                      unitsSold: {
                        inStore: monthlyProductInStoreUnitsSold,
                        online: monthlyProductOnlineUnitsSold,
                        total: monthlyProductTotalUnitsSold,
                      },
                      revenue: {
                        inStore: monthlyProductInStoreRevenue,
                        online: monthlyProductOnlineRevenue,
                        total: monthlyProductTotalRevenue,
                      },
                      dailyMetrics: dailyProductMetrics,
                    };

                    return monthlyProductMetric;
                  },
                );

                const [
                  yearlyProductTotalUnitsSold,
                  yearlyProductOnlineUnitsSold,
                  yearlyProductInStoreUnitsSold,
                  yearlyProductTotalRevenue,
                  yearlyProductOnlineRevenue,
                  yearlyProductInStoreRevenue,
                ] = monthlyProductMetrics.reduce(
                  (
                    yearlyProductMetricsAcc,
                    monthlyProductMetric,
                  ) => {
                    yearlyProductMetricsAcc[0] += monthlyProductMetric.unitsSold
                      .total;
                    yearlyProductMetricsAcc[1] += monthlyProductMetric.unitsSold
                      .online;
                    yearlyProductMetricsAcc[2] += monthlyProductMetric.unitsSold
                      .inStore;
                    yearlyProductMetricsAcc[3] +=
                      monthlyProductMetric.revenue.total;
                    yearlyProductMetricsAcc[4] +=
                      monthlyProductMetric.revenue.online;
                    yearlyProductMetricsAcc[5] += monthlyProductMetric.revenue
                      .inStore;

                    return yearlyProductMetricsAcc;
                  },
                  [0, 0, 0, 0, 0, 0],
                );

                const yearlyProductMetric: ProductYearlyMetric = {
                  year,
                  unitsSold: {
                    inStore: yearlyProductInStoreUnitsSold,
                    online: yearlyProductOnlineUnitsSold,
                    total: yearlyProductTotalUnitsSold,
                  },
                  revenue: {
                    inStore: yearlyProductInStoreRevenue,
                    online: yearlyProductOnlineRevenue,
                    total: yearlyProductTotalRevenue,
                  },
                  monthlyMetrics: monthlyProductMetrics,
                };

                return yearlyProductMetric;
              },
            );

          const randomProductMetrics: ProductMetric = {
            name: productCategory,
            yearlyMetrics: yearlyProductMetrics,
          };

          resolve(randomProductMetrics);
        }, 0);
      });
    }),
  );
}

/**
 * - aggregate product metrics for each store location into 'All Products' metrics
 */
function createAggregatedProductMetrics(
  productMetrics: Omit<ProductMetric[], "All Products">,
): Promise<ProductMetric> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const PRODUCT_METRIC_TEMPLATE: ProductMetric = {
        name: "All Products",
        yearlyMetrics: [],
      };

      const aggregatedProductMetrics = productMetrics.reduce<
        ProductMetric
      >(
        (productMetricsAcc, productMetric) => {
          const PRODUCT_METRIC_TEMPLATE_DAILY: ProductDailyMetric = {
            day: "",
            unitsSold: {
              inStore: 0,
              online: 0,
              total: 0,
            },
            revenue: {
              inStore: 0,
              online: 0,
              total: 0,
            },
          };
          const PRODUCT_METRIC_TEMPLATE_MONTHLY: ProductMonthlyMetric = {
            month: "January",
            unitsSold: {
              inStore: 0,
              online: 0,
              total: 0,
            },
            revenue: {
              inStore: 0,
              online: 0,
              total: 0,
            },
            dailyMetrics: [],
          };

          const PRODUCT_METRIC_TEMPLATE_YEARLY: ProductYearlyMetric = {
            year: "2021",
            unitsSold: {
              inStore: 0,
              online: 0,
              total: 0,
            },
            revenue: {
              inStore: 0,
              online: 0,
              total: 0,
            },
            monthlyMetrics: [],
          };

          const { yearlyMetrics } = productMetric;

          const aggregatedYearlyProductMetrics = yearlyMetrics.map(
            (productYearlyMetric) => {
              const { year, revenue, unitsSold, monthlyMetrics } =
                productYearlyMetric;

              const existingYearlyMetric = productMetricsAcc.yearlyMetrics.find(
                (productYearlyMetricAcc) =>
                  productYearlyMetricAcc.year === year,
              ) ??
                { ...PRODUCT_METRIC_TEMPLATE_YEARLY, year };

              const aggregatedYearlyMetric = {
                ...existingYearlyMetric,
                revenue: {
                  ...existingYearlyMetric.revenue,
                  total: existingYearlyMetric.revenue.total +
                    revenue.total,
                  online: existingYearlyMetric.revenue.online +
                    revenue.online,
                  inStore: existingYearlyMetric.revenue.inStore +
                    revenue.inStore,
                },
                unitsSold: {
                  ...existingYearlyMetric.unitsSold,
                  total: existingYearlyMetric.unitsSold.total +
                    unitsSold.total,
                  online: existingYearlyMetric.unitsSold.online +
                    unitsSold.online,
                  inStore: existingYearlyMetric.unitsSold.inStore +
                    unitsSold.inStore,
                },
              };

              const aggregatedMonthlyProductMetrics = monthlyMetrics.map(
                (productMonthlyMetric) => {
                  const {
                    month,
                    dailyMetrics,
                    revenue,
                    unitsSold,
                  } = productMonthlyMetric;

                  const existingMonthlyMetric = aggregatedYearlyMetric
                    .monthlyMetrics.find(
                      (productMonthlyMetricAcc) =>
                        productMonthlyMetricAcc
                          .month === month,
                    ) ??
                    {
                      ...PRODUCT_METRIC_TEMPLATE_MONTHLY,
                      month,
                    };

                  const aggregatedDailyRepairMetrics = dailyMetrics.map(
                    (productDailyMetric) => {
                      const {
                        day,
                        revenue,
                        unitsSold,
                      } = productDailyMetric;

                      const existingDailyMetric = existingMonthlyMetric
                        .dailyMetrics.find(
                          (
                            productDailyMetricAcc,
                          ) =>
                            productDailyMetricAcc
                              .day ===
                              day,
                        ) ??
                        {
                          ...PRODUCT_METRIC_TEMPLATE_DAILY,
                          day,
                        };

                      const aggregatedDailyMetric = {
                        ...existingDailyMetric,
                        revenue: {
                          ...existingDailyMetric
                            .revenue,
                          total: existingDailyMetric
                            .revenue
                            .total +
                            revenue
                              .total,
                          online: existingDailyMetric
                            .revenue
                            .online +
                            revenue
                              .online,
                          inStore: existingDailyMetric
                            .revenue
                            .inStore +
                            revenue
                              .inStore,
                        },
                        unitsSold: {
                          ...existingDailyMetric
                            .unitsSold,
                          total: existingDailyMetric
                            .unitsSold
                            .total +
                            unitsSold
                              .total,
                          online: existingDailyMetric
                            .unitsSold
                            .online +
                            unitsSold
                              .online,
                          inStore: existingDailyMetric
                            .unitsSold
                            .inStore +
                            unitsSold
                              .inStore,
                        },
                      };

                      return aggregatedDailyMetric;
                    },
                  );

                  const aggregatedMonthlyMetric = {
                    ...existingMonthlyMetric,
                    revenue: {
                      ...existingMonthlyMetric
                        .revenue,
                      total: existingMonthlyMetric
                        .revenue.total +
                        revenue.total,
                      online: existingMonthlyMetric
                        .revenue.online +
                        revenue.online,
                      inStore: existingMonthlyMetric
                        .revenue.inStore +
                        revenue.inStore,
                    },
                    unitsSold: {
                      ...existingMonthlyMetric
                        .unitsSold,
                      total: existingMonthlyMetric
                        .unitsSold.total +
                        unitsSold.total,
                      online: existingMonthlyMetric
                        .unitsSold.online +
                        unitsSold.online,
                      inStore: existingMonthlyMetric
                        .unitsSold.inStore +
                        unitsSold.inStore,
                    },
                    dailyMetrics: aggregatedDailyRepairMetrics,
                  };

                  return aggregatedMonthlyMetric;
                },
              );

              aggregatedYearlyMetric.monthlyMetrics =
                aggregatedMonthlyProductMetrics;

              return aggregatedYearlyMetric;
            },
          );

          productMetricsAcc.yearlyMetrics = aggregatedYearlyProductMetrics;

          return productMetricsAcc;
        },
        PRODUCT_METRIC_TEMPLATE,
      );

      resolve(aggregatedProductMetrics);
    }, 0);
  });
}

/**
 * - aggregate all store locations' product metrics into a separate 'All Locations' store
 */
function createAllLocationsAggregatedProductMetrics(
  businessMetrics: BusinessMetric[],
): Promise<ProductMetric[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // find all product metrics for each store location
      const initialProductMetrics: Record<string, ProductMetric[]> = {
        edmontonProductMetrics: [],
        calgaryProductMetrics: [],
        vancouverProductMetrics: [],
      };

      const {
        calgaryProductMetrics,
        edmontonProductMetrics,
        vancouverProductMetrics,
      } = businessMetrics.reduce((productMetricsAcc, businessMetric) => {
        const { storeLocation, productMetrics } = businessMetric;

        switch (storeLocation) {
          case "Calgary": {
            productMetricsAcc.calgaryProductMetrics = productMetrics;
            break;
          }
          case "Edmonton": {
            productMetricsAcc.edmontonProductMetrics = structuredClone(
              productMetrics,
            );
            break;
          }
          // case "Vancouver"
          default: {
            productMetricsAcc.vancouverProductMetrics = productMetrics;
            break;
          }
        }

        return productMetricsAcc;
      }, initialProductMetrics);

      // as edmonton metrics are a superset of all other stores' metrics, it is being used as
      // the base to which all other store locations' metrics are aggregated into

      const aggregatedBaseProductMetrics =
        aggregateStoresIntoBaseProductMetrics({
          baseProductMetrics: edmontonProductMetrics,
          storeProductMetrics: calgaryProductMetrics,
        });

      const aggregatedAllLocationsProductMetrics =
        aggregateStoresIntoBaseProductMetrics({
          baseProductMetrics: aggregatedBaseProductMetrics,
          storeProductMetrics: vancouverProductMetrics,
        });

      function aggregateStoresIntoBaseProductMetrics({
        baseProductMetrics,
        storeProductMetrics,
      }: {
        baseProductMetrics: ProductMetric[];
        storeProductMetrics: ProductMetric[];
      }) {
        return storeProductMetrics.reduce<ProductMetric[]>(
          (baseProductMetricsAcc, storeProductMetric) => {
            const { name, yearlyMetrics } = storeProductMetric;

            const baseProductMetric = baseProductMetricsAcc.find(
              (baseProductMetric) => baseProductMetric.name === name,
            );
            if (!baseProductMetric) {
              return baseProductMetricsAcc;
            }

            yearlyMetrics.forEach((storeYearlyMetric) => {
              const {
                year,
                revenue: yearlyRevenue,
                unitsSold: yearlyUnitsSold,
                monthlyMetrics,
              } = storeYearlyMetric;

              const baseYearlyMetric = baseProductMetric
                .yearlyMetrics.find(
                  (baseYearlyMetric) => baseYearlyMetric.year === year,
                );
              if (!baseYearlyMetric) {
                return baseProductMetricsAcc;
              }

              baseYearlyMetric.revenue.total += yearlyRevenue.total;
              baseYearlyMetric.revenue.online += yearlyRevenue.online;
              baseYearlyMetric.revenue.inStore += yearlyRevenue.inStore;

              baseYearlyMetric.unitsSold.total += yearlyUnitsSold.total;
              baseYearlyMetric.unitsSold.online += yearlyUnitsSold.online;
              baseYearlyMetric.unitsSold.inStore += yearlyUnitsSold.inStore;

              monthlyMetrics.forEach((storeMonthlyMetric) => {
                const {
                  month,
                  revenue: monthlyRevenue,
                  unitsSold: monthlyUnitsSold,
                  dailyMetrics,
                } = storeMonthlyMetric;

                const baseMonthlyMetric = baseYearlyMetric
                  .monthlyMetrics.find(
                    (baseMonthlyMetric) => baseMonthlyMetric.month === month,
                  );
                if (!baseMonthlyMetric) {
                  return baseProductMetricsAcc;
                }

                baseMonthlyMetric.revenue.total += monthlyRevenue.total;
                baseMonthlyMetric.revenue.online += monthlyRevenue.online;
                baseMonthlyMetric.revenue.inStore += monthlyRevenue.inStore;

                baseMonthlyMetric.unitsSold.total += monthlyUnitsSold.total;
                baseMonthlyMetric.unitsSold.online += monthlyUnitsSold.online;
                baseMonthlyMetric.unitsSold.inStore += monthlyUnitsSold.inStore;

                dailyMetrics.forEach((storeDailyMetric) => {
                  const { day, revenue, unitsSold } = storeDailyMetric;

                  const baseDailyMetric = baseMonthlyMetric
                    .dailyMetrics.find(
                      (baseDailyMetric) => baseDailyMetric.day === day,
                    );
                  if (!baseDailyMetric) {
                    return baseProductMetricsAcc;
                  }

                  baseDailyMetric.revenue.total += revenue.total;
                  baseDailyMetric.revenue.online += revenue.online;
                  baseDailyMetric.revenue.inStore += revenue.inStore;

                  baseDailyMetric.unitsSold.total += unitsSold.total;
                  baseDailyMetric.unitsSold.online += unitsSold.online;
                  baseDailyMetric.unitsSold.inStore += unitsSold.inStore;
                });
              });
            });

            return baseProductMetricsAcc;
          },
          baseProductMetrics,
        );
      }

      resolve(aggregatedAllLocationsProductMetrics);
    }, 0);
  });
}

/**
   *repairMetrics: {
      name: RepairCategory;
      yearlyMetrics: {
        year: string;
        revenue: number;
        unitsRepaired: number;

        monthlyMetrics: {
          month: string;
          revenue: number;
          unitsRepaired: number;

          dailyMetrics: {
            day: string;
            revenue: number;
            unitsRepaired: number;
          }[];
        }[];
      }[];
    }[]
   */

type CreateRandomRepairMetricsInput = {
  daysInMonthsInYears: DaysInMonthsInYears;
  repairCategories: RepairCategory[];
  storeLocation: StoreLocation;
};

async function createRandomRepairMetrics({
  daysInMonthsInYears,
  repairCategories,
  storeLocation,
}: CreateRandomRepairMetricsInput): Promise<RepairMetric[]> {
  /**
   * - random daily unitsRepaired spread between [min, max] per year
   */
  const YEAR_UNITS_REPAIRED_SPREAD: LocationYearSpread = {
    Edmonton: {
      "2013": [1, 2],
      "2014": [1, 3],
      "2015": [2, 4],
      "2016": [3, 5],
      "2017": [5, 7],
      "2018": [5, 9],
      "2019": [7, 11],
      "2020": [6, 8],
      "2021": [5, 8],
      "2022": [7, 11],
      "2023": [10, 13],
      "2024": [12, 14],
      "2025": [11, 13],
    },
    Calgary: {
      "2017": [2, 4],
      "2018": [2, 5],
      "2019": [6, 9],
      "2020": [5, 8],
      "2021": [4, 7],
      "2022": [6, 9],
      "2023": [8, 11],
      "2024": [9, 12],
      "2025": [8, 13],
    },
    Vancouver: {
      "2019": [3, 5],
      "2020": [6, 9],
      "2021": [5, 8],
      "2022": [6, 9],
      "2023": [9, 11],
      "2024": [10, 12],
      "2025": [9, 11],
    },
  };

  return await Promise.all(
    repairCategories.map(async (repairCategory) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const yearlyRepairMetrics = Array.from(daysInMonthsInYears)
            .map(
              (yearTuple) => {
                const [year, daysInMonthsMap] = yearTuple;

                const monthlyRepairMetrics = Array.from(
                  daysInMonthsMap,
                ).map(
                  (monthTuple) => {
                    const [month, daysRange] = monthTuple;

                    const dailyRepairMetrics = daysRange
                      .map((day) => {
                        const [
                          dailyRepairUnits,
                          dailyRepairRevenue,
                        ] = createRepairCategoryUnitsRepairedRevenueTuple(
                          {
                            repairCategory,
                            storeLocation,
                            year,
                            yearUnitsRepairedSpread: YEAR_UNITS_REPAIRED_SPREAD,
                          },
                        );

                        const dailyRepairMetric: RepairDailyMetric = {
                          day,
                          unitsRepaired: dailyRepairUnits,
                          revenue: dailyRepairRevenue,
                        };

                        return dailyRepairMetric;
                      });

                    const [
                      monthlyRepairTotalUnitsRepaired,
                      monthlyRepairTotalRevenue,
                    ] = dailyRepairMetrics.reduce(
                      (
                        monthlyRepairMetricsAcc,
                        dailyRepairMetric,
                      ) => {
                        monthlyRepairMetricsAcc[0] += dailyRepairMetric
                          .unitsRepaired;
                        monthlyRepairMetricsAcc[1] += dailyRepairMetric.revenue;

                        return monthlyRepairMetricsAcc;
                      },
                      [0, 0],
                    );

                    const monthlyRepairMetric: RepairMonthlyMetric = {
                      month,
                      unitsRepaired: monthlyRepairTotalUnitsRepaired,
                      revenue: monthlyRepairTotalRevenue,
                      dailyMetrics: dailyRepairMetrics,
                    };

                    return monthlyRepairMetric;
                  },
                );

                const [
                  yearlyRepairTotalUnitsRepaired,
                  yearlyRepairTotalRevenue,
                ] = monthlyRepairMetrics.reduce(
                  (
                    yearlyRepairMetricsAcc,
                    monthlyRepairMetric,
                  ) => {
                    yearlyRepairMetricsAcc[0] +=
                      monthlyRepairMetric.unitsRepaired;
                    yearlyRepairMetricsAcc[1] += monthlyRepairMetric.revenue;

                    return yearlyRepairMetricsAcc;
                  },
                  [0, 0],
                );

                const yearlyRepairMetric: RepairYearlyMetric = {
                  year,
                  unitsRepaired: yearlyRepairTotalUnitsRepaired,
                  revenue: yearlyRepairTotalRevenue,
                  monthlyMetrics: monthlyRepairMetrics,
                };

                return yearlyRepairMetric;
              },
            );

          const randomRepairMetrics: RepairMetric = {
            name: repairCategory,
            yearlyMetrics: yearlyRepairMetrics,
          };

          resolve(randomRepairMetrics);
        }, 0);
      });
    }),
  );
}

/**
 * - aggregate repair metrics for each store location into 'All Repairs' metrics
 */
function createAggregatedRepairMetrics(
  repairMetrics: Omit<RepairMetric[], "All Repairs">,
): Promise<RepairMetric> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const REPAIR_METRIC_TEMPLATE: RepairMetric = {
        name: "All Repairs",
        yearlyMetrics: [],
      };

      const aggregatedRepairMetrics = repairMetrics.reduce<RepairMetric>(
        (repairMetricsAcc, repairMetric) => {
          const REPAIR_METRIC_TEMPLATE_DAILY: RepairDailyMetric = {
            day: "",
            revenue: 0,
            unitsRepaired: 0,
          };
          const REPAIR_METRIC_TEMPLATE_MONTHLY: RepairMonthlyMetric = {
            month: "January",
            revenue: 0,
            unitsRepaired: 0,
            dailyMetrics: [],
          };
          const REPAIR_METRIC_TEMPLATE_YEARLY: RepairYearlyMetric = {
            year: "2021",
            revenue: 0,
            unitsRepaired: 0,
            monthlyMetrics: [],
          };

          const { yearlyMetrics } = repairMetric;

          const aggregatedYearlyRepairMetrics = yearlyMetrics.map(
            (repairYearlyMetric) => {
              const {
                year,
                revenue,
                unitsRepaired,
                monthlyMetrics,
              } = repairYearlyMetric;

              const existingYearlyMetric = repairMetricsAcc.yearlyMetrics.find(
                (repairYearlyMetricAcc) => repairYearlyMetricAcc.year === year,
              ) ?? { ...REPAIR_METRIC_TEMPLATE_YEARLY, year };

              const aggregatedYearlyMetric = {
                ...existingYearlyMetric,
                revenue: existingYearlyMetric.revenue + revenue,
                unitsRepaired: existingYearlyMetric.unitsRepaired +
                  unitsRepaired,
              };

              const aggregatedMonthlyRepairMetrics = monthlyMetrics.map(
                (repairMonthlyMetric) => {
                  const {
                    month,
                    dailyMetrics,
                    revenue,
                    unitsRepaired,
                  } = repairMonthlyMetric;

                  const existingMonthlyMetric = aggregatedYearlyMetric
                    .monthlyMetrics.find(
                      (repairMonthlyMetricAcc) =>
                        repairMonthlyMetricAcc
                          .month === month,
                    ) ??
                    {
                      ...REPAIR_METRIC_TEMPLATE_MONTHLY,
                      month,
                    };

                  const aggregatedDailyRepairMetrics = dailyMetrics.map(
                    (repairDailyMetric) => {
                      const {
                        day,
                        revenue,
                        unitsRepaired,
                      } = repairDailyMetric;

                      const existingDailyMetric = existingMonthlyMetric
                        .dailyMetrics.find(
                          (
                            repairDailyMetricAcc,
                          ) =>
                            repairDailyMetricAcc
                              .day ===
                              day,
                        ) ??
                        {
                          ...REPAIR_METRIC_TEMPLATE_DAILY,
                          day,
                        };

                      const aggregatedDailyMetric = {
                        ...existingDailyMetric,
                        revenue: existingDailyMetric
                          .revenue +
                          revenue,
                        unitsRepaired: existingDailyMetric
                          .unitsRepaired +
                          unitsRepaired,
                      };

                      return aggregatedDailyMetric;
                    },
                  );

                  const aggregatedMonthlyMetric = {
                    ...existingMonthlyMetric,
                    revenue: existingMonthlyMetric.revenue +
                      revenue,
                    unitsRepaired: existingMonthlyMetric
                      .unitsRepaired +
                      unitsRepaired,
                    dailyMetrics: aggregatedDailyRepairMetrics,
                  };

                  return aggregatedMonthlyMetric;
                },
              );
              aggregatedYearlyMetric.monthlyMetrics =
                aggregatedMonthlyRepairMetrics;

              return aggregatedYearlyMetric;
            },
          );

          repairMetricsAcc.yearlyMetrics = aggregatedYearlyRepairMetrics;

          return repairMetricsAcc;
        },
        REPAIR_METRIC_TEMPLATE,
      );

      resolve(aggregatedRepairMetrics);
    }, 0);
  });
}

function createAllLocationsAggregatedRepairMetrics(
  businessMetrics: BusinessMetric[],
): Promise<RepairMetric[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // find all repair metrics for each store location
      const initialRepairMetrics: Record<string, RepairMetric[]> = {
        edmontonRepairMetrics: [],
        calgaryRepairMetrics: [],
        vancouverRepairMetrics: [],
      };

      const {
        calgaryRepairMetrics,
        edmontonRepairMetrics,
        vancouverRepairMetrics,
      } = businessMetrics.reduce((repairMetricsAcc, businessMetric) => {
        const { storeLocation, repairMetrics } = businessMetric;

        switch (storeLocation) {
          case "Calgary": {
            repairMetricsAcc.calgaryRepairMetrics = repairMetrics;
            break;
          }
          case "Edmonton": {
            repairMetricsAcc.edmontonRepairMetrics = structuredClone(
              repairMetrics,
            );
            break;
          }
          // case "Vancouver"
          default: {
            repairMetricsAcc.vancouverRepairMetrics = repairMetrics;
            break;
          }
        }

        return repairMetricsAcc;
      }, initialRepairMetrics);

      // as edmonton metrics are a superset of all other stores' metrics, it is being used as
      // the base to which all other store locations' metrics are aggregated into

      const aggregatedBaseRepairMetrics = aggregateStoresIntoBaseRepairMetrics({
        baseRepairMetrics: edmontonRepairMetrics,
        storeRepairMetrics: calgaryRepairMetrics,
      });

      const aggregatedAllLocationsRepairMetrics =
        aggregateStoresIntoBaseRepairMetrics({
          baseRepairMetrics: aggregatedBaseRepairMetrics,
          storeRepairMetrics: vancouverRepairMetrics,
        });

      function aggregateStoresIntoBaseRepairMetrics({
        baseRepairMetrics,
        storeRepairMetrics,
      }: {
        baseRepairMetrics: RepairMetric[];
        storeRepairMetrics: RepairMetric[];
      }) {
        return storeRepairMetrics.reduce<RepairMetric[]>(
          (baseRepairMetricsAcc, storeRepairMetric) => {
            const { name, yearlyMetrics } = storeRepairMetric;

            const baseRepairMetric = baseRepairMetricsAcc.find(
              (baseRepairMetric) => baseRepairMetric.name === name,
            );
            if (!baseRepairMetric) {
              return baseRepairMetricsAcc;
            }

            yearlyMetrics.forEach((storeYearlyMetric) => {
              const {
                year,
                revenue: yearlyRevenue,
                unitsRepaired: yearlyUnitsRepaired,
                monthlyMetrics,
              } = storeYearlyMetric;

              const baseYearlyMetric = baseRepairMetric
                .yearlyMetrics.find(
                  (baseYearlyMetric) => baseYearlyMetric.year === year,
                );
              if (!baseYearlyMetric) {
                return baseRepairMetricsAcc;
              }

              baseYearlyMetric.revenue += yearlyRevenue;
              baseYearlyMetric.unitsRepaired += yearlyUnitsRepaired;

              monthlyMetrics.forEach((storeMonthlyMetric) => {
                const {
                  month,
                  revenue: monthlyRevenue,
                  unitsRepaired: monthlyUnitsRepaired,
                  dailyMetrics,
                } = storeMonthlyMetric;

                const baseMonthlyMetric = baseYearlyMetric
                  .monthlyMetrics.find(
                    (baseMonthlyMetric) => baseMonthlyMetric.month === month,
                  );
                if (!baseMonthlyMetric) {
                  return baseRepairMetricsAcc;
                }

                baseMonthlyMetric.revenue += monthlyRevenue;
                baseMonthlyMetric.unitsRepaired += monthlyUnitsRepaired;

                dailyMetrics.forEach((storeDailyMetric) => {
                  const { day, revenue, unitsRepaired } = storeDailyMetric;

                  const baseDailyMetric = baseMonthlyMetric
                    .dailyMetrics.find(
                      (baseDailyMetric) => baseDailyMetric.day === day,
                    );
                  if (!baseDailyMetric) {
                    return baseRepairMetricsAcc;
                  }

                  baseDailyMetric.revenue += revenue;
                  baseDailyMetric.unitsRepaired += unitsRepaired;
                });
              });
            });

            return baseRepairMetricsAcc;
          },
          baseRepairMetrics,
        );
      }

      resolve(aggregatedAllLocationsRepairMetrics);
    }, 0);
  });
}

/**
   * customerMetrics: {
      totalCustomers: number;
      lifetimeValue: number;

      yearlyMetrics: {
        year: Year;
        customers: {
          total: number;
          new: {
            total: number;
            sales: {
              total: number;
              online: number;
              inStore: number;
            };
            repair: number;
          };
          returning: {
            total: number;
            sales: {
              total: number;
              online: number;
              inStore: number;
            };
            repair: number;
          };
          churnRate: number;
          retentionRate: number;
        };


        monthlyMetrics: {
          month: Month;
          customers: {
            total: number;
            new: {
              total: number;
              sales: {
                total: number;
                online: number;
                inStore: number;
              };
              repair: number;
            };
            returning: {
              total: number;
              sales: {
                total: number;
                online: number;
                inStore: number;
              };
              repair: number;
            };
            churnRate: number;
            retentionRate: number;
          };

          dailyMetrics: {
            day: string;
            customers: {
              total: number;
              new: {
                total: number;
                sales: {
                  total: number;
                  online: number;
                  inStore: number;
                };
                repair: number;
              };
              returning: {
                total: number;
                sales: {
                  total: number;
                  online: number;
                  inStore: number;
                };
                repair: number;
              };
              churnRate: number;
              retentionRate: number;
            };
          }[]
        }
      }
    }
   */

type CreateRandomCustomerMetricsInput = {
  daysInMonthsInYears: DaysInMonthsInYears;
  storeLocation: StoreLocation;
};

async function createRandomCustomerMetrics({
  daysInMonthsInYears,
  storeLocation,
}: CreateRandomCustomerMetricsInput): Promise<CustomerMetrics> {
  /**
   * churn rate spread between [min, max] per year
   * @see https://customergauge.com/blog/average-churn-rate-by-industry
   */
  const YEAR_CHURN_RATE_SPREAD: LocationYearSpread = {
    Edmonton: {
      "2013": [0.3, 0.4],
      "2014": [0.25, 0.3],
      "2015": [0.2, 0.25],
      "2016": [0.18, 0.22],
      "2017": [0.16, 0.2],
      "2018": [0.15, 0.18],
      "2019": [0.13, 0.16],
      "2020": [0.1, 0.12],
      "2021": [0.09, 0.11],
      "2022": [0.09, 0.11],
      "2023": [0.11, 0.12],
      "2024": [0.12, 0.15],
      "2025": [0.11, 0.13],
    },
    Calgary: {
      "2017": [0.18, 0.22],
      "2018": [0.15, 0.18],
      "2019": [0.13, 0.16],
      "2020": [0.1, 0.12],
      "2021": [0.09, 0.11],
      "2022": [0.09, 0.11],
      "2023": [0.1, 0.12],
      "2024": [0.12, 0.15],
      "2025": [0.11, 0.14],
    },
    Vancouver: {
      "2019": [0.13, 0.16],
      "2020": [0.1, 0.12],
      "2021": [0.09, 0.11],
      "2022": [0.09, 0.11],
      "2023": [0.1, 0.12],
      "2024": [0.13, 0.17],
      "2025": [0.12, 0.14],
    },
  };

  /**
   * - random daily customers spread between [min, max] per year
   */
  const YEAR_CUSTOMERS_SPREAD: LocationYearSpread = {
    Edmonton: {
      "2013": [60, 260],
      "2014": [80, 280],
      "2015": [100, 300],
      "2016": [120, 320],
      "2017": [220, 420],
      "2018": [260, 460],
      "2019": [300, 500],
      "2020": [500, 700],
      "2021": [540, 740],
      "2022": [540, 740],
      "2023": [460, 660],
      "2024": [520, 720],
      "2025": [500, 700],
    },
    Calgary: {
      "2017": [60, 260],
      "2018": [80, 280],
      "2019": [100, 300],
      "2020": [120, 320],
      "2021": [220, 420],
      "2022": [260, 460],
      "2023": [300, 500],
      "2024": [360, 460],
      "2025": [440, 540],
    },
    Vancouver: {
      "2019": [80, 280],
      "2020": [180, 380],
      "2021": [340, 460],
      "2022": [460, 540],
      "2023": [300, 460],
      "2024": [360, 420],
      "2025": [440, 500],
    },
  };

  /**
   * - random daily new customers fraction spread between [min, max] per year
   */
  const YEAR_NEW_CUSTOMERS_SPREAD: LocationYearSpread = {
    Edmonton: {
      "2013": [0.6, 0.7],
      "2014": [0.5, 0.7],
      "2015": [0.4, 0.6],
      "2016": [0.35, 0.55],
      "2017": [0.3, 0.5],
      "2018": [0.25, 0.45],
      "2019": [0.25, 0.4],
      "2020": [0.2, 0.35],
      "2021": [0.2, 0.35],
      "2022": [0.2, 0.35],
      "2023": [0.15, 0.3],
      "2024": [0.18, 0.25],
      "2025": [0.17, 0.29],
    },
    Calgary: {
      "2017": [0.6, 0.7],
      "2018": [0.5, 0.7],
      "2019": [0.4, 0.6],
      "2020": [0.35, 0.55],
      "2021": [0.3, 0.5],
      "2022": [0.25, 0.45],
      "2023": [0.25, 0.4],
      "2024": [0.21, 0.35],
      "2025": [0.23, 0.35],
    },
    Vancouver: {
      "2019": [0.6, 0.7],
      "2020": [0.5, 0.7],
      "2021": [0.4, 0.6],
      "2022": [0.35, 0.55],
      "2023": [0.3, 0.5],
      "2024": [0.25, 0.45],
      "2025": [0.27, 0.4],
    },
  };

  const yearlyCustomersMetrics = await Promise.all(
    Array.from(daysInMonthsInYears).map(async (yearTuple) => {
      return new Promise<CustomerYearlyMetric>((resolve) => {
        setTimeout(() => {
          const [year, daysInMonthsMap] = yearTuple;

          const monthlyCustomersMetrics = Array.from(daysInMonthsMap)
            .map(
              (monthTuple) => {
                const [month, daysRange] = monthTuple;

                const dailyCustomersMetrics = daysRange.map(
                  (day) => {
                    const dailyTotalCustomers = createRandomNumber({
                      storeLocation,
                      year,
                      yearUnitsSpread: YEAR_CUSTOMERS_SPREAD,
                      defaultMax: 15,
                      defaultMin: 5,
                    });

                    const dailyNewCustomersFraction = createRandomNumber({
                      storeLocation,
                      year,
                      yearUnitsSpread: YEAR_NEW_CUSTOMERS_SPREAD,
                      defaultMax: 0.2,
                      defaultMin: 0.1,
                      isFraction: true,
                    });
                    const dailyNewCustomers = Math.round(
                      dailyTotalCustomers *
                        dailyNewCustomersFraction,
                    );

                    const dailyNewCustomersRepairFraction =
                      Math.random() * (0.15 - 0.05) +
                      0.05;
                    const dailyNewCustomersRepair = Math
                      .round(
                        dailyNewCustomers *
                          dailyNewCustomersRepairFraction,
                      );

                    const dailyNewCustomersSales = dailyNewCustomers -
                      dailyNewCustomersRepair;

                    const dailyNewCustomersOnlineFraction =
                      Math.random() * (0.9 - 0.7) + 0.7;
                    const dailyNewCustomersOnline = Math
                      .round(
                        dailyNewCustomersSales *
                          dailyNewCustomersOnlineFraction,
                      );

                    const dailyNewCustomersInStore = dailyNewCustomersSales -
                      dailyNewCustomersOnline;

                    const dailyReturningCustomers = dailyTotalCustomers -
                      dailyNewCustomers;

                    const dailyReturningCustomersRepairFraction =
                      Math.random() * (0.15 - 0.05) +
                      0.05;
                    const dailyReturningCustomersRepair = Math.round(
                      dailyReturningCustomers *
                        dailyReturningCustomersRepairFraction,
                    );

                    const dailyReturningCustomersSales =
                      dailyReturningCustomers -
                      dailyReturningCustomersRepair;

                    const dailyReturningCustomersOnlineFraction =
                      Math.random() * (0.9 - 0.7) + 0.7;
                    const dailyReturningCustomersOnline = Math.round(
                      dailyReturningCustomersSales *
                        dailyReturningCustomersOnlineFraction,
                    );

                    const dailyReturningCustomersInStore =
                      dailyReturningCustomersSales -
                      dailyReturningCustomersOnline;

                    const dailyCustomersChurnRate = createRandomNumber({
                      storeLocation,
                      year,
                      yearUnitsSpread: YEAR_CHURN_RATE_SPREAD,
                      defaultMax: 0.3,
                      defaultMin: 0.1,
                      isFraction: true,
                    });

                    const dailyCustomersRetentionRate = 1 -
                      dailyCustomersChurnRate;

                    const dailyCustomersMetric: CustomerDailyMetric = {
                      day,
                      customers: {
                        total: dailyTotalCustomers,
                        new: {
                          total: dailyNewCustomers,
                          sales: {
                            total: dailyNewCustomersSales,
                            online: dailyNewCustomersOnline,
                            inStore: dailyNewCustomersInStore,
                          },
                          repair: dailyNewCustomersRepair,
                        },
                        returning: {
                          total: dailyReturningCustomers,
                          sales: {
                            total: dailyReturningCustomersSales,
                            online: dailyReturningCustomersOnline,
                            inStore: dailyReturningCustomersInStore,
                          },
                          repair: dailyReturningCustomersRepair,
                        },
                        churnRate: dailyCustomersChurnRate,
                        retentionRate: dailyCustomersRetentionRate,
                      },
                    };

                    return dailyCustomersMetric;
                  },
                );

                const initialMonthlyCustomersMetrics: CustomerMonthlyMetric = {
                  month,
                  customers: {
                    new: {
                      repair: 0,
                      sales: {
                        inStore: 0,
                        online: 0,
                        total: 0,
                      },
                      total: 0,
                    },
                    returning: {
                      repair: 0,
                      sales: {
                        inStore: 0,
                        online: 0,
                        total: 0,
                      },
                      total: 0,
                    },
                    total: 0,
                    churnRate: 0,
                    retentionRate: 0,
                  },
                  dailyMetrics: dailyCustomersMetrics,
                };

                const monthlyCustomersMetrics = dailyCustomersMetrics.reduce(
                  (
                    monthlyCustomersMetricsAcc,
                    dailyCustomersMetric,
                  ) => {
                    monthlyCustomersMetricsAcc.customers
                      .total += dailyCustomersMetric
                        .customers.total;

                    monthlyCustomersMetricsAcc.customers
                      .new.total += dailyCustomersMetric
                        .customers.new.total;
                    monthlyCustomersMetricsAcc.customers
                      .new.repair += dailyCustomersMetric
                        .customers.new.repair;
                    monthlyCustomersMetricsAcc.customers
                      .new.sales.total += dailyCustomersMetric
                        .customers.new.sales
                        .total;
                    monthlyCustomersMetricsAcc.customers
                      .new.sales.online += dailyCustomersMetric
                        .customers.new.sales
                        .online;
                    monthlyCustomersMetricsAcc.customers
                      .new.sales.inStore += dailyCustomersMetric
                        .customers.new.sales
                        .inStore;

                    monthlyCustomersMetricsAcc.customers
                      .returning.total += dailyCustomersMetric
                        .customers.returning
                        .total;
                    monthlyCustomersMetricsAcc.customers
                      .returning.repair += dailyCustomersMetric
                        .customers.returning
                        .repair;
                    monthlyCustomersMetricsAcc.customers
                      .returning.sales.total += dailyCustomersMetric
                        .customers.returning
                        .sales.total;
                    monthlyCustomersMetricsAcc.customers
                      .returning.sales.online += dailyCustomersMetric
                        .customers.returning
                        .sales.online;
                    monthlyCustomersMetricsAcc.customers
                      .returning.sales
                      .inStore += dailyCustomersMetric
                        .customers.returning
                        .sales.inStore;

                    monthlyCustomersMetricsAcc.customers
                      .churnRate += dailyCustomersMetric
                        .customers.churnRate;
                    monthlyCustomersMetricsAcc.customers
                      .retentionRate += dailyCustomersMetric
                        .customers
                        .retentionRate;

                    return monthlyCustomersMetricsAcc;
                  },
                  initialMonthlyCustomersMetrics,
                );

                monthlyCustomersMetrics.customers.churnRate = toFixedFloat(
                  monthlyCustomersMetrics.customers
                    .churnRate /
                    dailyCustomersMetrics.length,
                );

                monthlyCustomersMetrics.customers
                  .retentionRate = toFixedFloat(
                    monthlyCustomersMetrics.customers
                      .retentionRate /
                      dailyCustomersMetrics.length,
                  );

                return monthlyCustomersMetrics;
              },
            );

          const initialYearlyCustomersMetrics: CustomerYearlyMetric = {
            year,
            customers: {
              total: 0,
              new: {
                repair: 0,
                sales: {
                  inStore: 0,
                  online: 0,
                  total: 0,
                },
                total: 0,
              },
              returning: {
                repair: 0,
                sales: {
                  inStore: 0,
                  online: 0,
                  total: 0,
                },
                total: 0,
              },
              churnRate: 0,
              retentionRate: 0,
            },
            monthlyMetrics: monthlyCustomersMetrics,
          };

          const yearlyCustomersMetrics = monthlyCustomersMetrics
            .reduce(
              (
                yearlyCustomersMetricsAcc,
                monthlyCustomersMetric,
              ) => {
                yearlyCustomersMetricsAcc.customers.total +=
                  monthlyCustomersMetric.customers.total;

                yearlyCustomersMetricsAcc.customers.new.total +=
                  monthlyCustomersMetric.customers.new.total;
                yearlyCustomersMetricsAcc.customers.new
                  .repair += monthlyCustomersMetric.customers.new
                    .repair;
                yearlyCustomersMetricsAcc.customers.new.sales
                  .total += monthlyCustomersMetric.customers.new
                    .sales.total;
                yearlyCustomersMetricsAcc.customers.new.sales
                  .online += monthlyCustomersMetric.customers.new
                    .sales.online;
                yearlyCustomersMetricsAcc.customers.new.sales
                  .inStore += monthlyCustomersMetric.customers.new
                    .sales.inStore;

                yearlyCustomersMetricsAcc.customers.returning
                  .total += monthlyCustomersMetric.customers
                    .returning.total;
                yearlyCustomersMetricsAcc.customers.returning
                  .repair += monthlyCustomersMetric.customers
                    .returning.repair;
                yearlyCustomersMetricsAcc.customers.returning
                  .sales.total += monthlyCustomersMetric.customers
                    .returning.sales.total;
                yearlyCustomersMetricsAcc.customers.returning
                  .sales.online += monthlyCustomersMetric.customers
                    .returning.sales.online;
                yearlyCustomersMetricsAcc.customers.returning
                  .sales.inStore += monthlyCustomersMetric.customers
                    .returning.sales.inStore;

                yearlyCustomersMetricsAcc.customers.churnRate +=
                  monthlyCustomersMetric.customers.churnRate;
                yearlyCustomersMetricsAcc.customers
                  .retentionRate += monthlyCustomersMetric.customers
                    .retentionRate;

                return yearlyCustomersMetricsAcc;
              },
              initialYearlyCustomersMetrics,
            );

          yearlyCustomersMetrics.customers.churnRate = toFixedFloat(
            yearlyCustomersMetrics.customers.churnRate /
              monthlyCustomersMetrics.length,
          );

          yearlyCustomersMetrics.customers.retentionRate = toFixedFloat(
            yearlyCustomersMetrics.customers.retentionRate /
              monthlyCustomersMetrics.length,
          );

          resolve(yearlyCustomersMetrics);
        }, 0);
      });
    }),
  );

  const randomLifetimeValue = Math.round(
    Math.random() * (2000 - 1000) + 1000,
  );
  const randomTotalCustomers = yearlyCustomersMetrics.reduce(
    (
      totalCustomersAcc,
      yearlyCustomersMetric,
      // was changed from +=
    ) => (totalCustomersAcc + yearlyCustomersMetric.customers.total),
    0,
  );

  const randomCustomerMetrics: CustomerMetrics = {
    totalCustomers: randomTotalCustomers,
    lifetimeValue: randomLifetimeValue,
    yearlyMetrics: yearlyCustomersMetrics,
  };

  return randomCustomerMetrics;
}

function createAllLocationsAggregatedCustomerMetrics(
  businessMetrics: BusinessMetric[],
): Promise<CustomerMetrics> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // find all customer metrics for each store location
      const initialCustomerMetrics: Record<string, CustomerMetrics> = {
        edmontonCustomerMetrics: {
          lifetimeValue: 0,
          totalCustomers: 0,
          yearlyMetrics: [],
        },
        calgaryCustomerMetrics: {
          lifetimeValue: 0,
          totalCustomers: 0,
          yearlyMetrics: [],
        },
        vancouverCustomerMetrics: {
          lifetimeValue: 0,
          totalCustomers: 0,
          yearlyMetrics: [],
        },
      };

      const {
        calgaryCustomerMetrics,
        edmontonCustomerMetrics,
        vancouverCustomerMetrics,
      } = businessMetrics.reduce((customerMetricsAcc, businessMetric) => {
        const { storeLocation, customerMetrics } = businessMetric;

        switch (storeLocation) {
          case "Calgary": {
            customerMetricsAcc.calgaryCustomerMetrics = customerMetrics;
            break;
          }
          case "Edmonton": {
            customerMetricsAcc.edmontonCustomerMetrics = structuredClone(
              customerMetrics,
            );
            break;
          }
          // case "Vancouver"
          default: {
            customerMetricsAcc.vancouverCustomerMetrics = customerMetrics;
            break;
          }
        }

        return customerMetricsAcc;
      }, initialCustomerMetrics);

      // as edmonton metrics are a superset of all other stores' metrics, it is being used as
      // the base to which all other store locations' metrics are aggregated into

      const aggregatedBaseCustomerMetrics =
        aggregateStoresIntoBaseCustomerMetrics({
          baseCustomerMetrics: edmontonCustomerMetrics,
          storeCustomerMetrics: calgaryCustomerMetrics,
        });

      const aggregatedAllLocationsCustomerMetrics =
        aggregateStoresIntoBaseCustomerMetrics({
          baseCustomerMetrics: aggregatedBaseCustomerMetrics,
          storeCustomerMetrics: vancouverCustomerMetrics,
        });

      function aggregateStoresIntoBaseCustomerMetrics({
        baseCustomerMetrics,
        storeCustomerMetrics,
      }: {
        baseCustomerMetrics: CustomerMetrics;
        storeCustomerMetrics: CustomerMetrics;
      }) {
        const { lifetimeValue, totalCustomers, yearlyMetrics } =
          storeCustomerMetrics;

        baseCustomerMetrics.lifetimeValue =
          (baseCustomerMetrics.lifetimeValue + lifetimeValue) / 2;
        baseCustomerMetrics.totalCustomers += totalCustomers;

        return yearlyMetrics.reduce<CustomerMetrics>(
          (baseCustomerMetricsAcc, storeCustomerMetric) => {
            const { year, customers, monthlyMetrics } = storeCustomerMetric;
            const {
              total,
              new: newCustomers,
              returning: returningCustomers,
              churnRate,
              retentionRate,
            } = customers;

            const baseYearlyMetric = baseCustomerMetricsAcc
              .yearlyMetrics.find(
                (baseYearlyMetric) => baseYearlyMetric.year === year,
              );
            if (!baseYearlyMetric) {
              return baseCustomerMetricsAcc;
            }

            baseYearlyMetric.customers.total += total;
            baseYearlyMetric.customers.new.total += newCustomers.total;
            baseYearlyMetric.customers.new.repair += newCustomers.repair;
            baseYearlyMetric.customers.new.sales.total +=
              newCustomers.sales.total;
            baseYearlyMetric.customers.new.sales.online +=
              newCustomers.sales.online;
            baseYearlyMetric.customers.new.sales.inStore +=
              newCustomers.sales.inStore;

            baseYearlyMetric.customers.returning.total +=
              returningCustomers.total;
            baseYearlyMetric.customers.returning.repair +=
              returningCustomers.repair;
            baseYearlyMetric.customers.returning.sales.total +=
              returningCustomers.sales.total;
            baseYearlyMetric.customers.returning.sales.online +=
              returningCustomers.sales.online;
            baseYearlyMetric.customers.returning.sales.inStore +=
              returningCustomers.sales.inStore;

            baseYearlyMetric.customers.churnRate =
              (baseYearlyMetric.customers.churnRate + churnRate) /
              2;
            baseYearlyMetric.customers.retentionRate =
              (baseYearlyMetric.customers.retentionRate +
                retentionRate) / 2;

            monthlyMetrics.forEach((storeMonthlyMetric) => {
              const { month, customers, dailyMetrics } = storeMonthlyMetric;
              const {
                total,
                new: newCustomers,
                returning: returningCustomers,
                churnRate,
                retentionRate,
              } = customers;

              const baseMonthlyMetric = baseYearlyMetric
                .monthlyMetrics.find(
                  (baseMonthlyMetric) => baseMonthlyMetric.month === month,
                );
              if (!baseMonthlyMetric) {
                return baseCustomerMetricsAcc;
              }

              baseMonthlyMetric.customers.total += total;
              baseMonthlyMetric.customers.new.total += newCustomers.total;
              baseMonthlyMetric.customers.new.repair += newCustomers.repair;
              baseMonthlyMetric.customers.new.sales.total +=
                newCustomers.sales.total;
              baseMonthlyMetric.customers.new.sales.online +=
                newCustomers.sales.online;
              baseMonthlyMetric.customers.new.sales.inStore +=
                newCustomers.sales.inStore;

              baseMonthlyMetric.customers.returning.total +=
                returningCustomers.total;
              baseMonthlyMetric.customers.returning.repair +=
                returningCustomers.repair;
              baseMonthlyMetric.customers.returning.sales.total +=
                returningCustomers.sales.total;
              baseMonthlyMetric.customers.returning.sales
                .online += returningCustomers.sales.online;
              baseMonthlyMetric.customers.returning.sales
                .inStore += returningCustomers.sales.inStore;

              baseMonthlyMetric.customers.churnRate =
                (baseMonthlyMetric.customers.churnRate +
                  churnRate) / 2;
              baseMonthlyMetric.customers.retentionRate =
                (baseMonthlyMetric.customers.retentionRate +
                  retentionRate) / 2;

              dailyMetrics.forEach((storeDailyMetric) => {
                const { day, customers } = storeDailyMetric;
                const {
                  total,
                  new: newCustomers,
                  returning: returningCustomers,
                } = customers;

                const baseDailyMetric = baseMonthlyMetric
                  .dailyMetrics.find(
                    (baseDailyMetric) => baseDailyMetric.day === day,
                  );
                if (!baseDailyMetric) {
                  return baseCustomerMetricsAcc;
                }

                baseDailyMetric.customers.total += total;
                baseDailyMetric.customers.new.total += newCustomers.total;
                baseDailyMetric.customers.new.repair += newCustomers.repair;
                baseDailyMetric.customers.new.sales.total +=
                  newCustomers.sales.total;
                baseDailyMetric.customers.new.sales.online +=
                  newCustomers.sales.online;
                baseDailyMetric.customers.new.sales.inStore +=
                  newCustomers.sales.inStore;

                baseDailyMetric.customers.returning.total +=
                  returningCustomers.total;
                baseDailyMetric.customers.returning.repair +=
                  returningCustomers.repair;
                baseDailyMetric.customers.returning.sales
                  .total += returningCustomers.sales.total;
                baseDailyMetric.customers.returning.sales
                  .online += returningCustomers.sales.online;
                baseDailyMetric.customers.returning.sales
                  .inStore += returningCustomers.sales.inStore;
              });
            });

            return baseCustomerMetricsAcc;
          },
          baseCustomerMetrics,
        );
      }

      resolve(aggregatedAllLocationsCustomerMetrics);
    }, 0);
  });
}

/**
   * financialMetrics: {
      year: Year;
      averageOrderValue: number;
      conversionRate: number;
      netProfitMargin: number;

      expenses: {
        total: number;
        repair: number;
        sales: {
          total: number;
          inStore: number;
          online: number;
        };
      };

      profit: {
        total: number;
        repair: number;
        sales: {
          total: number;
          inStore: number;
          online: number;
        };
      };

      revenue: {
        total: number;
        repair: number;
        sales: {
          total: number;
          inStore: number;
          online: number;
        };
      };

      transactions: {
        total: number;
        repair: number;
        sales: {
          total: number;
          inStore: number;
          online: number;
        };
      };

      monthlyMetrics: {
        month: Month;
        averageOrderValue: number;
        conversionRate: number;
        netProfitMargin: number;

        expenses: {
          total: number;
          repair: number;
          sales: {
            total: number;
            inStore: number;
            online: number;
          };
        };

        profit: {
          total: number;
          repair: number;
          sales: {
            total: number;
            inStore: number;
            online: number;
          };
        };

        revenue: {
          total: number;
          repair: number;
          sales: {
            total: number;
            inStore: number;
            online: number;
          };
        };

        transactions: {
          total: number;
          repair: number;
          sales: {
            total: number;
            inStore: number;
            online: number;
          };
        };

        dailyMetrics: {
          day: string;
          averageOrderValue: number;
          conversionRate: number;
          netProfitMargin: number;

          // generated
          expenses: {
            total: number;
            repair: number;
            sales: {
              total: number;
              inStore: number;
              online: number;
            };
          };

          // calculated from expenses and revenue
          profit: {
            total: number;
            repair: number;
            sales: {
              total: number;
              inStore: number;
              online: number;
            };
          };

          // aggregated from metrics
          revenue: {
            total: number;
            repair: number;
            sales: {
              total: number;
              inStore: number;
              online: number;
            };
          };

          // aggregated from metrics
          transactions: {
            total: number;
            repair: number;
            sales: {
              total: number;
              inStore: number;
              online: number;
            };
          };
        }[];
      }[];
    }[];
   */

type CreateRandomFinancialMetricsInput = {
  businessMetrics: BusinessMetric[];
  storeLocations: StoreLocation[];
};

async function createRandomFinancialMetrics({
  businessMetrics,
  storeLocations,
}: CreateRandomFinancialMetricsInput): Promise<
  (StoreLocation | YearlyFinancialMetric[])[][]
> {
  /**
   * - random daily profitMargin spread between [min, max] per year
   */
  const YEAR_PROFIT_MARGIN_SPREAD: LocationYearSpread = {
    Edmonton: {
      "2013": [0.03, 0.13],
      "2014": [0.04, 0.14],
      "2015": [0.05, 0.15],
      "2016": [0.06, 0.16],
      "2017": [0.11, 0.21],
      "2018": [0.13, 0.23],
      "2019": [0.15, 0.25],
      "2020": [0.25, 0.35],
      "2021": [0.27, 0.37],
      "2022": [0.27, 0.37],
      "2023": [0.23, 0.33],
      "2024": [0.24, 0.31],
      "2025": [0.29, 0.38],
    },
    Calgary: {
      "2017": [0.07, 0.17],
      "2018": [0.08, 0.18],
      "2019": [0.09, 0.19],
      "2020": [0.15, 0.25],
      "2021": [0.17, 0.27],
      "2022": [0.17, 0.27],
      "2023": [0.13, 0.23],
      "2024": [0.14, 0.29],
      "2025": [0.15, 0.29],
    },
    Vancouver: {
      "2019": [0.09, 0.19],
      "2020": [0.13, 0.23],
      "2021": [0.17, 0.27],
      "2022": [0.17, 0.27],
      "2023": [0.15, 0.25],
      "2024": [0.16, 0.24],
      "2025": [0.17, 0.27],
    },
  };

  /**
   * ratio of repair profit to total profit spread between [min, max] per year
   */
  const YEAR_REPAIR_PROFIT_SPREAD: LocationYearSpread = {
    Edmonton: {
      "2013": [0, 0.01],
      "2014": [0.01, 0.015],
      "2015": [0.015, 0.02],
      "2016": [0.02, 0.025],
      "2017": [0.05, 0.055],
      "2018": [0.055, 0.06],
      "2019": [0.06, 0.065],
      "2020": [0.08, 0.085],
      "2021": [0.085, 0.09],
      "2022": [0.085, 0.09],
      "2023": [0.075, 0.08],
      "2024": [0.07, 0.075],
      "2025": [0.075, 0.077],
    },
    Calgary: {
      "2017": [0.02, 0.025],
      "2018": [0.025, 0.03],
      "2019": [0.03, 0.035],
      "2020": [0.05, 0.055],
      "2021": [0.055, 0.06],
      "2022": [0.055, 0.06],
      "2023": [0.045, 0.05],
      "2024": [0.04, 0.045],
      "2025": [0.045, 0.049],
    },
    Vancouver: {
      "2019": [0.03, 0.035],
      "2020": [0.045, 0.05],
      "2021": [0.055, 0.06],
      "2022": [0.055, 0.06],
      "2023": [0.05, 0.055],
      "2024": [0.045, 0.05],
      "2025": [0.05, 0.055],
    },
  };

  /**
   * ratio of online profit to (total profit - repair profit) spread between [min, max] per year
   */
  const YEAR_ONLINE_PROFIT_SPREAD: LocationYearSpread = {
    Edmonton: {
      "2013": [0.3, 0.35],
      "2014": [0.35, 0.4],
      "2015": [0.4, 0.45],
      "2016": [0.45, 0.5],
      "2017": [0.5, 0.55],
      "2018": [0.55, 0.6],
      "2019": [0.6, 0.65],
      "2020": [0.65, 0.7],
      "2021": [0.7, 0.75],
      "2022": [0.7, 0.75],
      "2023": [0.65, 0.7],
      "2024": [0.67, 0.69],
      "2025": [0.65, 0.69],
    },
    Calgary: {
      "2017": [0.4, 0.45],
      "2018": [0.45, 0.5],
      "2019": [0.5, 0.55],
      "2020": [0.55, 0.6],
      "2021": [0.6, 0.65],
      "2022": [0.6, 0.65],
      "2023": [0.55, 0.6],
      "2024": [0.6, 0.62],
      "2025": [0.6, 0.65],
    },
    Vancouver: {
      "2019": [0.45, 0.5],
      "2020": [0.55, 0.6],
      "2021": [0.6, 0.65],
      "2022": [0.6, 0.65],
      "2023": [0.55, 0.6],
      "2024": [0.6, 0.61],
      "2025": [0.65, 0.68],
    },
  };

  /**
   * ratio of repair expenses to total expenses spread between [min, max] per year
   */
  const YEAR_REPAIR_EXPENSES_SPREAD: LocationYearSpread = {
    Edmonton: {
      "2013": [0.23, 0.25],
      "2014": [0.21, 0.23],
      "2015": [0.19, 0.21],
      "2016": [0.17, 0.19],
      "2017": [0.15, 0.17],
      "2018": [0.13, 0.15],
      "2019": [0.11, 0.13],
      "2020": [0.1, 0.12],
      "2021": [0.09, 0.11],
      "2022": [0.09, 0.1],
      "2023": [0.1, 0.11],
      "2024": [0.12, 0.14],
      "2025": [0.11, 0.113],
    },
    Calgary: {
      "2017": [0.15, 0.17],
      "2018": [0.13, 0.15],
      "2019": [0.11, 0.13],
      "2020": [0.1, 0.12],
      "2021": [0.09, 0.11],
      "2022": [0.09, 0.1],
      "2023": [0.1, 0.11],
      "2024": [0.13, 0.15],
      "2025": [0.12, 0.121],
    },
    Vancouver: {
      "2019": [0.11, 0.13],
      "2020": [0.1, 0.12],
      "2021": [0.09, 0.11],
      "2022": [0.09, 0.1],
      "2023": [0.1, 0.11],
      "2024": [0.14, 0.15],
      "2025": [0.12, 0.129],
    },
  };

  /**
   * ratio of online expenses to sales expenses spread between [min, max] per year
   */
  const YEAR_ONLINE_EXPENSES_SPREAD: LocationYearSpread = {
    Edmonton: {
      "2013": [0.2, 0.22],
      "2014": [0.18, 0.2],
      "2015": [0.16, 0.18],
      "2016": [0.14, 0.16],
      "2017": [0.1, 0.12],
      "2018": [0.08, 0.1],
      "2019": [0.06, 0.08],
      "2020": [0.05, 0.07],
      "2021": [0.04, 0.06],
      "2022": [0.04, 0.06],
      "2023": [0.05, 0.07],
      "2024": [0.05, 0.07],
      "2025": [0.051, 0.075],
    },
    Calgary: {
      "2017": [0.14, 0.16],
      "2018": [0.12, 0.14],
      "2019": [0.1, 0.12],
      "2020": [0.08, 0.1],
      "2021": [0.06, 0.08],
      "2022": [0.06, 0.08],
      "2023": [0.05, 0.07],
      "2024": [0.05, 0.07],
      "2025": [0.052, 0.073],
    },
    Vancouver: {
      "2019": [0.1, 0.12],
      "2020": [0.08, 0.1],
      "2021": [0.06, 0.08],
      "2022": [0.06, 0.08],
      "2023": [0.05, 0.07],
      "2024": [0.05, 0.07],
      "2025": [0.053, 0.076],
    },
  };

  /**
   * conversion rate spread between [min, max] per year
   * @see https://www.ruleranalytics.com/blog/insight/conversion-rate-by-industry/
   */
  const YEAR_CONVERSION_RATE_SPREAD: LocationYearSpread = {
    Edmonton: {
      "2013": [0.01, 0.011],
      "2014": [0.011, 0.012],
      "2015": [0.012, 0.013],
      "2016": [0.013, 0.014],
      "2017": [0.02, 0.025],
      "2018": [0.025, 0.03],
      "2019": [0.03, 0.035],
      "2020": [0.035, 0.04],
      "2021": [0.04, 0.045],
      "2022": [0.04, 0.045],
      "2023": [0.035, 0.04],
      "2024": [0.03, 0.035],
      "2025": [0.032, 0.036],
    },
    Calgary: {
      "2017": [0.02, 0.025],
      "2018": [0.025, 0.03],
      "2019": [0.03, 0.035],
      "2020": [0.035, 0.04],
      "2021": [0.04, 0.045],
      "2022": [0.04, 0.045],
      "2023": [0.035, 0.04],
      "2024": [0.031, 0.035],
      "2025": [0.031, 0.034],
    },
    Vancouver: {
      "2019": [0.03, 0.035],
      "2020": [0.035, 0.04],
      "2021": [0.04, 0.045],
      "2022": [0.04, 0.045],
      "2023": [0.035, 0.04],
      "2024": [0.031, 0.035],
      "2025": [0.033, 0.036],
    },
  };

  const YEARLY_FINANCIAL_METRICS_TEMPLATE: YearlyFinancialMetric = {
    year: "2013",
    averageOrderValue: 0,
    conversionRate: 0,
    netProfitMargin: 0,

    expenses: {
      total: 0,
      repair: 0,
      sales: {
        total: 0,
        online: 0,
        inStore: 0,
      },
    },

    profit: {
      total: 0,
      repair: 0,
      sales: {
        total: 0,
        online: 0,
        inStore: 0,
      },
    },

    revenue: {
      total: 0,
      repair: 0,
      sales: {
        total: 0,
        online: 0,
        inStore: 0,
      },
    },

    transactions: {
      total: 0,
      repair: 0,
      sales: {
        total: 0,
        online: 0,
        inStore: 0,
      },
    },

    monthlyMetrics: [],
  };

  const MONTHLY_FINANCIAL_METRICS_TEMPLATE: MonthlyFinancialMetric = {
    month: "January",
    averageOrderValue: 0,
    conversionRate: 0,
    netProfitMargin: 0,

    expenses: {
      total: 0,
      repair: 0,
      sales: {
        total: 0,
        online: 0,
        inStore: 0,
      },
    },

    profit: {
      total: 0,
      repair: 0,
      sales: {
        total: 0,
        online: 0,
        inStore: 0,
      },
    },

    revenue: {
      total: 0,
      repair: 0,
      sales: {
        total: 0,
        online: 0,
        inStore: 0,
      },
    },

    transactions: {
      total: 0,
      repair: 0,
      sales: {
        total: 0,
        online: 0,
        inStore: 0,
      },
    },

    dailyMetrics: [],
  };

  const DAILY_FINANCIAL_METRICS_TEMPLATE: DailyFinancialMetric = {
    day: "2021-01-01",
    averageOrderValue: 0,
    conversionRate: 0,
    netProfitMargin: 0,

    expenses: {
      total: 0,
      repair: 0,
      sales: {
        total: 0,
        online: 0,
        inStore: 0,
      },
    },

    profit: {
      total: 0,
      repair: 0,
      sales: {
        total: 0,
        online: 0,
        inStore: 0,
      },
    },

    revenue: {
      total: 0,
      repair: 0,
      sales: {
        total: 0,
        online: 0,
        inStore: 0,
      },
    },

    transactions: {
      total: 0,
      repair: 0,
      sales: {
        total: 0,
        online: 0,
        inStore: 0,
      },
    },
  };

  return await Promise.all(
    storeLocations.map(async (storeLocation) => {
      return new Promise<[StoreLocation, YearlyFinancialMetric[]]>(
        (resolve) => {
          setTimeout(async () => {
            // for this store location, find the created product and repair metrics
            const businessMetric = businessMetrics.find(
              (businessMetric) =>
                businessMetric.storeLocation === storeLocation,
            );
            if (!businessMetric) {
              return [];
            }

            const { productMetrics, repairMetrics } = businessMetric;

            // 'All Products' category in productMetrics is already aggregated from other product categories
            const allProductsCategory = productMetrics.find(
              (productMetric) => productMetric.name === "All Products",
            );
            // 'All Repairs' category in repairMetrics is already aggregated from other repair categories
            const allRepairsCategory = repairMetrics.find(
              (repairMetric) => repairMetric.name === "All Repairs",
            );
            if (!allProductsCategory || !allRepairsCategory) {
              return [];
            }

            const daysInMonthsInYears = returnDaysInMonthsInYears({
              daysPerMonth: DAYS_PER_MONTH,
              months: MONTHS,
              storeLocation,
            });

            const yearlyFinancialMetrics = await Promise.all(
              Array.from(daysInMonthsInYears).map(
                async (yearTuple) => {
                  return new Promise<YearlyFinancialMetric>(
                    (resolve_) => {
                      setTimeout(() => {
                        const [year, daysInMonthsMap] = yearTuple;

                        const yearlyProductMetrics = allProductsCategory
                          .yearlyMetrics.find(
                            (
                              yearlyProductMetric,
                            ) =>
                              yearlyProductMetric
                                .year === year,
                          );
                        const yearlyRepairMetrics = allRepairsCategory
                          .yearlyMetrics
                          .find(
                            (
                              yearlyRepairMetric,
                            ) =>
                              yearlyRepairMetric
                                .year === year,
                          );
                        if (
                          !yearlyProductMetrics ||
                          !yearlyRepairMetrics
                        ) {
                          return YEARLY_FINANCIAL_METRICS_TEMPLATE;
                        }

                        const monthlyFinancialMetrics = Array.from(
                          daysInMonthsMap,
                        )
                          .map(
                            (monthTuple) => {
                              const [
                                month,
                                daysRange,
                              ] = monthTuple;

                              const monthlyProductMetrics = yearlyProductMetrics
                                .monthlyMetrics
                                .find(
                                  (
                                    monthlyProductMetric,
                                  ) =>
                                    monthlyProductMetric
                                      .month ===
                                      month,
                                );
                              const monthlyRepairMetrics = yearlyRepairMetrics
                                .monthlyMetrics
                                .find(
                                  (
                                    monthlyRepairMetric,
                                  ) =>
                                    monthlyRepairMetric
                                      .month ===
                                      month,
                                );
                              if (
                                !monthlyProductMetrics ||
                                !monthlyRepairMetrics
                              ) {
                                return MONTHLY_FINANCIAL_METRICS_TEMPLATE;
                              }

                              const dailyFinancialMetrics = daysRange
                                .map(
                                  (
                                    day,
                                  ) => {
                                    const dailyProductMetrics =
                                      monthlyProductMetrics
                                        .dailyMetrics
                                        .find(
                                          (
                                            dailyProductMetric,
                                          ) =>
                                            dailyProductMetric
                                              .day ===
                                              day,
                                        );
                                    const dailyRepairMetrics =
                                      monthlyRepairMetrics
                                        .dailyMetrics
                                        .find(
                                          (
                                            dailyRepairMetric,
                                          ) =>
                                            dailyRepairMetric
                                              .day ===
                                              day,
                                        );
                                    if (
                                      !dailyProductMetrics ||
                                      !dailyRepairMetrics
                                    ) {
                                      return DAILY_FINANCIAL_METRICS_TEMPLATE;
                                    }

                                    const dailyTransactions:
                                      FinancialMetricCategories = {
                                        total: dailyProductMetrics
                                          .unitsSold
                                          .total +
                                          dailyRepairMetrics
                                            .unitsRepaired,
                                        repair: dailyRepairMetrics
                                          .unitsRepaired,
                                        sales: {
                                          total: dailyProductMetrics
                                            .unitsSold
                                            .total,
                                          inStore: dailyProductMetrics
                                            .unitsSold
                                            .inStore,
                                          online: dailyProductMetrics
                                            .unitsSold
                                            .online,
                                        },
                                      };

                                    const dailyRevenues:
                                      FinancialMetricCategories = {
                                        total: dailyProductMetrics
                                          .revenue
                                          .total +
                                          dailyRepairMetrics
                                            .revenue,
                                        repair: dailyRepairMetrics
                                          .revenue,
                                        sales: {
                                          total: dailyProductMetrics
                                            .revenue
                                            .total,
                                          inStore: dailyProductMetrics
                                            .revenue
                                            .inStore,
                                          online: dailyProductMetrics
                                            .revenue
                                            .inStore,
                                        },
                                      };

                                    const dailyAverageOrderValue = Math.round(
                                      dailyRevenues
                                        .total /
                                        dailyTransactions
                                          .total,
                                    );

                                    let dailyConversionRate =
                                      createRandomNumber(
                                        {
                                          storeLocation,
                                          year,
                                          yearUnitsSpread:
                                            YEAR_CONVERSION_RATE_SPREAD,
                                          defaultMax: 0.03,
                                          defaultMin: 0.01,
                                          isFraction: true,
                                        },
                                      );
                                    dailyConversionRate = toFixedFloat(
                                      dailyConversionRate,
                                    );

                                    // generate expenses to calculate profit

                                    let dailyNetProfitMargin =
                                      createRandomNumber(
                                        {
                                          storeLocation,
                                          year,
                                          yearUnitsSpread:
                                            YEAR_PROFIT_MARGIN_SPREAD,
                                          defaultMax: 0.3,
                                          defaultMin: 0.1,
                                          isFraction: true,
                                        },
                                      );
                                    dailyNetProfitMargin = toFixedFloat(
                                      dailyNetProfitMargin,
                                    );

                                    const dailyProfit = Math.round(
                                      dailyRevenues
                                        .total *
                                        dailyNetProfitMargin,
                                    );

                                    const dailyRepairProfitFraction =
                                      createRandomNumber(
                                        {
                                          storeLocation,
                                          year,
                                          yearUnitsSpread:
                                            YEAR_REPAIR_PROFIT_SPREAD,
                                          defaultMax: 0.3,
                                          defaultMin: 0.1,
                                          isFraction: true,
                                        },
                                      );
                                    const dailyRepairProfit = Math.round(
                                      dailyRepairProfitFraction *
                                        dailyProfit,
                                    );

                                    const dailySalesProfit = Math.round(
                                      dailyProfit -
                                        dailyRepairProfit,
                                    );

                                    const dailyOnlineProfitFraction =
                                      createRandomNumber(
                                        {
                                          storeLocation,
                                          year,
                                          yearUnitsSpread:
                                            YEAR_ONLINE_PROFIT_SPREAD,
                                          defaultMax: 0.03,
                                          defaultMin: 0.01,
                                          isFraction: true,
                                        },
                                      );
                                    const dailyOnlineProfit = Math.round(
                                      dailySalesProfit *
                                        dailyOnlineProfitFraction,
                                    );

                                    const dailyInStoreProfit =
                                      dailySalesProfit -
                                      dailyOnlineProfit;

                                    const dailyProfits:
                                      FinancialMetricCategories = {
                                        total: dailyProfit,
                                        repair: dailyRepairProfit,
                                        sales: {
                                          total: dailySalesProfit,
                                          inStore: dailyInStoreProfit,
                                          online: dailyOnlineProfit,
                                        },
                                      };

                                    const dailyExpense = Math.round(
                                      dailyRevenues
                                        .total -
                                        dailyProfit,
                                    );

                                    const dailyRepairExpenseFraction =
                                      createRandomNumber(
                                        {
                                          storeLocation,
                                          year,
                                          yearUnitsSpread:
                                            YEAR_REPAIR_EXPENSES_SPREAD,
                                          defaultMax: 0.3,
                                          defaultMin: 0.1,
                                          isFraction: true,
                                        },
                                      );
                                    const dailyRepairExpense = Math.round(
                                      dailyRepairExpenseFraction *
                                        dailyExpense,
                                    );

                                    const dailySalesExpense = dailyExpense -
                                      dailyRepairExpense;

                                    const dailyOnlineExpenseFraction =
                                      createRandomNumber(
                                        {
                                          storeLocation,
                                          year,
                                          yearUnitsSpread:
                                            YEAR_ONLINE_EXPENSES_SPREAD,
                                          defaultMax: 0.03,
                                          defaultMin: 0.01,
                                          isFraction: true,
                                        },
                                      );
                                    const dailyOnlineExpense = Math.round(
                                      dailySalesExpense *
                                        dailyOnlineExpenseFraction,
                                    );

                                    const dailyInStoreExpense =
                                      dailySalesExpense -
                                      dailyOnlineExpense;

                                    const dailyExpenses:
                                      FinancialMetricCategories = {
                                        total: dailyExpense,
                                        repair: dailyRepairExpense,
                                        sales: {
                                          total: dailySalesExpense,
                                          inStore: dailyInStoreExpense,
                                          online: dailyOnlineExpense,
                                        },
                                      };

                                    const dailyFinancialMetric:
                                      DailyFinancialMetric = {
                                        day,
                                        averageOrderValue:
                                          dailyAverageOrderValue,
                                        conversionRate: dailyConversionRate,
                                        netProfitMargin: dailyNetProfitMargin,
                                        expenses: dailyExpenses,
                                        profit: dailyProfits,
                                        revenue: dailyRevenues,
                                        transactions: dailyTransactions,
                                      };

                                    return dailyFinancialMetric;
                                  },
                                );

                              // aggregate created daily financial metrics into monthly financial metrics

                              const monthlyFinancialMetric =
                                dailyFinancialMetrics
                                  .reduce<
                                    MonthlyFinancialMetric
                                  >(
                                    (
                                      monthlyFinancialMetricAcc,
                                      dailyFinancialMetric,
                                    ) => {
                                      monthlyFinancialMetricAcc
                                        .month = month;

                                      monthlyFinancialMetricAcc
                                        .averageOrderValue +=
                                          dailyFinancialMetric
                                            .averageOrderValue;
                                      monthlyFinancialMetricAcc
                                        .conversionRate += dailyFinancialMetric
                                          .conversionRate;
                                      monthlyFinancialMetricAcc
                                        .netProfitMargin += dailyFinancialMetric
                                          .netProfitMargin;

                                      monthlyFinancialMetricAcc
                                        .expenses
                                        .total += dailyFinancialMetric
                                          .expenses
                                          .total;
                                      monthlyFinancialMetricAcc
                                        .expenses
                                        .repair += dailyFinancialMetric
                                          .expenses
                                          .repair;
                                      monthlyFinancialMetricAcc
                                        .expenses
                                        .sales
                                        .total += dailyFinancialMetric
                                          .expenses
                                          .sales
                                          .total;
                                      monthlyFinancialMetricAcc
                                        .expenses
                                        .sales
                                        .inStore += dailyFinancialMetric
                                          .expenses
                                          .sales
                                          .inStore;
                                      monthlyFinancialMetricAcc
                                        .expenses
                                        .sales
                                        .online += dailyFinancialMetric
                                          .expenses
                                          .sales
                                          .online;

                                      monthlyFinancialMetricAcc
                                        .profit
                                        .total += dailyFinancialMetric
                                          .profit
                                          .total;
                                      monthlyFinancialMetricAcc
                                        .profit
                                        .repair += dailyFinancialMetric
                                          .profit
                                          .repair;
                                      monthlyFinancialMetricAcc
                                        .profit
                                        .sales
                                        .total += dailyFinancialMetric
                                          .profit
                                          .sales
                                          .total;
                                      monthlyFinancialMetricAcc
                                        .profit
                                        .sales
                                        .inStore += dailyFinancialMetric
                                          .profit
                                          .sales
                                          .inStore;
                                      monthlyFinancialMetricAcc
                                        .profit
                                        .sales
                                        .online += dailyFinancialMetric
                                          .profit
                                          .sales
                                          .online;

                                      monthlyFinancialMetricAcc
                                        .revenue
                                        .total += dailyFinancialMetric
                                          .revenue
                                          .total;
                                      monthlyFinancialMetricAcc
                                        .revenue
                                        .repair += dailyFinancialMetric
                                          .revenue
                                          .repair;
                                      monthlyFinancialMetricAcc
                                        .revenue
                                        .sales
                                        .total += dailyFinancialMetric
                                          .revenue
                                          .sales
                                          .total;
                                      monthlyFinancialMetricAcc
                                        .revenue
                                        .sales
                                        .inStore += dailyFinancialMetric
                                          .revenue
                                          .sales
                                          .inStore;
                                      monthlyFinancialMetricAcc
                                        .revenue
                                        .sales
                                        .online += dailyFinancialMetric
                                          .revenue
                                          .sales
                                          .online;

                                      monthlyFinancialMetricAcc
                                        .transactions
                                        .total += dailyFinancialMetric
                                          .transactions
                                          .total;
                                      monthlyFinancialMetricAcc
                                        .transactions
                                        .repair += dailyFinancialMetric
                                          .transactions
                                          .repair;
                                      monthlyFinancialMetricAcc
                                        .transactions
                                        .sales
                                        .total += dailyFinancialMetric
                                          .transactions
                                          .sales
                                          .total;
                                      monthlyFinancialMetricAcc
                                        .transactions
                                        .sales
                                        .inStore += dailyFinancialMetric
                                          .transactions
                                          .sales
                                          .inStore;
                                      monthlyFinancialMetricAcc
                                        .transactions
                                        .sales
                                        .online += dailyFinancialMetric
                                          .transactions
                                          .sales
                                          .online;

                                      return monthlyFinancialMetricAcc;
                                    },
                                    structuredClone(
                                      MONTHLY_FINANCIAL_METRICS_TEMPLATE,
                                    ),
                                  );

                              monthlyFinancialMetric
                                .averageOrderValue = Math.round(
                                  monthlyFinancialMetric
                                    .averageOrderValue /
                                    dailyFinancialMetrics
                                      .length,
                                );
                              monthlyFinancialMetric
                                .conversionRate = toFixedFloat(
                                  monthlyFinancialMetric
                                    .conversionRate /
                                    dailyFinancialMetrics
                                      .length,
                                );
                              monthlyFinancialMetric
                                .netProfitMargin = toFixedFloat(
                                  monthlyFinancialMetric
                                    .netProfitMargin /
                                    dailyFinancialMetrics
                                      .length,
                                  2,
                                );
                              monthlyFinancialMetric
                                .dailyMetrics = dailyFinancialMetrics;

                              return monthlyFinancialMetric;
                            },
                          );

                        // aggregate created monthly financial metrics into yearly financial metrics

                        const yearlyFinancialMetric = monthlyFinancialMetrics
                          .reduce<
                            YearlyFinancialMetric
                          >(
                            (
                              yearlyFinancialMetricAcc,
                              monthlyFinancialMetric,
                            ) => {
                              yearlyFinancialMetricAcc
                                .year = year;

                              yearlyFinancialMetricAcc
                                .averageOrderValue += monthlyFinancialMetric
                                  .averageOrderValue;
                              yearlyFinancialMetricAcc
                                .conversionRate += monthlyFinancialMetric
                                  .conversionRate;
                              yearlyFinancialMetricAcc
                                .netProfitMargin += monthlyFinancialMetric
                                  .netProfitMargin;

                              yearlyFinancialMetricAcc
                                .expenses
                                .total += monthlyFinancialMetric
                                  .expenses
                                  .total;
                              yearlyFinancialMetricAcc
                                .expenses
                                .repair += monthlyFinancialMetric
                                  .expenses
                                  .repair;
                              yearlyFinancialMetricAcc
                                .expenses
                                .sales
                                .total += monthlyFinancialMetric
                                  .expenses
                                  .sales
                                  .total;
                              yearlyFinancialMetricAcc
                                .expenses
                                .sales
                                .inStore += monthlyFinancialMetric
                                  .expenses
                                  .sales
                                  .inStore;
                              yearlyFinancialMetricAcc
                                .expenses
                                .sales
                                .online += monthlyFinancialMetric
                                  .expenses
                                  .sales
                                  .online;

                              yearlyFinancialMetricAcc
                                .profit
                                .total += monthlyFinancialMetric
                                  .profit
                                  .total;
                              yearlyFinancialMetricAcc
                                .profit
                                .repair += monthlyFinancialMetric
                                  .profit
                                  .repair;
                              yearlyFinancialMetricAcc
                                .profit
                                .sales
                                .total += monthlyFinancialMetric
                                  .profit
                                  .sales
                                  .total;
                              yearlyFinancialMetricAcc
                                .profit
                                .sales
                                .inStore += monthlyFinancialMetric
                                  .profit
                                  .sales
                                  .inStore;
                              yearlyFinancialMetricAcc
                                .profit
                                .sales
                                .online += monthlyFinancialMetric
                                  .profit
                                  .sales
                                  .online;

                              yearlyFinancialMetricAcc
                                .revenue
                                .total += monthlyFinancialMetric
                                  .revenue
                                  .total;
                              yearlyFinancialMetricAcc
                                .revenue
                                .repair += monthlyFinancialMetric
                                  .revenue
                                  .repair;
                              yearlyFinancialMetricAcc
                                .revenue
                                .sales
                                .total += monthlyFinancialMetric
                                  .revenue
                                  .sales
                                  .total;
                              yearlyFinancialMetricAcc
                                .revenue
                                .sales
                                .inStore += monthlyFinancialMetric
                                  .revenue
                                  .sales
                                  .inStore;
                              yearlyFinancialMetricAcc
                                .revenue
                                .sales
                                .online += monthlyFinancialMetric
                                  .revenue
                                  .sales
                                  .online;

                              yearlyFinancialMetricAcc
                                .transactions
                                .total += monthlyFinancialMetric
                                  .transactions
                                  .total;
                              yearlyFinancialMetricAcc
                                .transactions
                                .repair += monthlyFinancialMetric
                                  .transactions
                                  .repair;
                              yearlyFinancialMetricAcc
                                .transactions
                                .sales
                                .total += monthlyFinancialMetric
                                  .transactions
                                  .sales
                                  .total;
                              yearlyFinancialMetricAcc
                                .transactions
                                .sales
                                .inStore += monthlyFinancialMetric
                                  .transactions
                                  .sales
                                  .inStore;
                              yearlyFinancialMetricAcc
                                .transactions
                                .sales
                                .online += monthlyFinancialMetric
                                  .transactions
                                  .sales
                                  .online;

                              return yearlyFinancialMetricAcc;
                            },
                            structuredClone(
                              YEARLY_FINANCIAL_METRICS_TEMPLATE,
                            ),
                          );

                        yearlyFinancialMetric
                          .averageOrderValue = Math
                            .round(
                              yearlyFinancialMetric
                                .averageOrderValue /
                                monthlyFinancialMetrics
                                  .length,
                            );
                        yearlyFinancialMetric
                          .conversionRate = toFixedFloat(
                            yearlyFinancialMetric
                              .conversionRate /
                              monthlyFinancialMetrics
                                .length,
                          );
                        yearlyFinancialMetric
                          .netProfitMargin = toFixedFloat(
                            yearlyFinancialMetric
                              .netProfitMargin /
                              monthlyFinancialMetrics
                                .length,
                            2,
                          );
                        yearlyFinancialMetric
                          .monthlyMetrics = monthlyFinancialMetrics;

                        resolve_(yearlyFinancialMetric);
                      });
                    },
                  );
                },
              ),
            );

            resolve([storeLocation, yearlyFinancialMetrics]);
          });
        },
      );
    }),
  );
}

function createAllLocationsAggregatedFinancialMetrics(
  businessMetrics: BusinessMetric[],
): YearlyFinancialMetric[] {
  // find all financial metrics for each store location
  const initialFinancialMetrics: Record<string, YearlyFinancialMetric[]> = {
    edmontonFinancialMetrics: [],
    calgaryFinancialMetrics: [],
    vancouverFinancialMetrics: [],
  };

  const {
    calgaryFinancialMetrics,
    edmontonFinancialMetrics,
    vancouverFinancialMetrics,
  } = businessMetrics.reduce((financialMetricsAcc, businessMetric) => {
    const { storeLocation, financialMetrics } = businessMetric;

    switch (storeLocation) {
      case "Calgary": {
        financialMetricsAcc.calgaryFinancialMetrics = financialMetrics;
        break;
      }
      case "Edmonton": {
        financialMetricsAcc.edmontonFinancialMetrics = structuredClone(
          financialMetrics,
        );
        break;
      }
      // case "Vancouver"
      default: {
        financialMetricsAcc.vancouverFinancialMetrics = financialMetrics;
        break;
      }
    }

    return financialMetricsAcc;
  }, initialFinancialMetrics);

  // as edmonton metrics are a superset of all other stores' metrics, it is being used as
  // the base to which all other store locations' metrics are aggregated into

  const aggregatedBaseFinancialMetrics =
    aggregateStoresIntoBaseFinancialMetrics({
      baseFinancialMetrics: edmontonFinancialMetrics,
      storeFinancialMetrics: calgaryFinancialMetrics,
    });

  const aggregatedAllLocationsFinancialMetrics =
    aggregateStoresIntoBaseFinancialMetrics({
      baseFinancialMetrics: aggregatedBaseFinancialMetrics,
      storeFinancialMetrics: vancouverFinancialMetrics,
    });

  function aggregateStoresIntoBaseFinancialMetrics({
    baseFinancialMetrics,
    storeFinancialMetrics,
  }: {
    baseFinancialMetrics: YearlyFinancialMetric[];
    storeFinancialMetrics: YearlyFinancialMetric[];
  }) {
    return storeFinancialMetrics.reduce<YearlyFinancialMetric[]>(
      (baseFinancialMetricsAcc, storeFinancialMetric) => {
        const {
          year,
          averageOrderValue,
          conversionRate,
          netProfitMargin,
          expenses,
          monthlyMetrics,
          profit,
          revenue,
          transactions,
        } = storeFinancialMetric;

        const baseYearlyMetric = baseFinancialMetricsAcc.find(
          (baseYearlyMetric) => baseYearlyMetric.year === year,
        );
        if (!baseYearlyMetric) {
          return baseFinancialMetricsAcc;
        }

        baseYearlyMetric.averageOrderValue =
          (baseYearlyMetric.averageOrderValue + averageOrderValue) /
          2;
        baseYearlyMetric.conversionRate =
          (baseYearlyMetric.conversionRate + conversionRate) / 2;
        baseYearlyMetric.netProfitMargin =
          (baseYearlyMetric.netProfitMargin + netProfitMargin) / 2;

        baseYearlyMetric.expenses.total += expenses.total;
        baseYearlyMetric.expenses.repair += expenses.repair;
        baseYearlyMetric.expenses.sales.total += expenses.sales.total;
        baseYearlyMetric.expenses.sales.inStore += expenses.sales.inStore;
        baseYearlyMetric.expenses.sales.online += expenses.sales.online;

        baseYearlyMetric.profit.total += profit.total;
        baseYearlyMetric.profit.repair += profit.repair;
        baseYearlyMetric.profit.sales.total += profit.sales.total;
        baseYearlyMetric.profit.sales.inStore += profit.sales.inStore;
        baseYearlyMetric.profit.sales.online += profit.sales.online;

        baseYearlyMetric.revenue.total += revenue.total;
        baseYearlyMetric.revenue.repair += revenue.repair;
        baseYearlyMetric.revenue.sales.total += revenue.sales.total;
        baseYearlyMetric.revenue.sales.inStore += revenue.sales.inStore;
        baseYearlyMetric.revenue.sales.online += revenue.sales.online;

        baseYearlyMetric.transactions.total += transactions.total;
        baseYearlyMetric.transactions.repair += transactions.repair;
        baseYearlyMetric.transactions.sales.total += transactions.sales.total;
        baseYearlyMetric.transactions.sales.inStore +=
          transactions.sales.inStore;
        baseYearlyMetric.transactions.sales.online += transactions.sales.online;

        monthlyMetrics.forEach((storeMonthlyMetric) => {
          const {
            month,
            averageOrderValue,
            conversionRate,
            netProfitMargin,
            expenses,
            profit,
            revenue,
            transactions,
            dailyMetrics,
          } = storeMonthlyMetric;

          const baseMonthlyMetric = baseYearlyMetric.monthlyMetrics
            .find(
              (baseMonthlyMetric) => baseMonthlyMetric.month === month,
            );
          if (!baseMonthlyMetric) {
            return;
          }

          baseMonthlyMetric.averageOrderValue +=
            (baseMonthlyMetric.averageOrderValue +
              averageOrderValue) / 2;
          baseMonthlyMetric.conversionRate +=
            (baseMonthlyMetric.conversionRate + conversionRate) / 2;
          baseMonthlyMetric.netProfitMargin +=
            (baseMonthlyMetric.netProfitMargin + netProfitMargin) /
            2;

          baseMonthlyMetric.expenses.total += expenses.total;
          baseMonthlyMetric.expenses.repair += expenses.repair;
          baseMonthlyMetric.expenses.sales.total += expenses.sales.total;
          baseMonthlyMetric.expenses.sales.inStore += expenses.sales.inStore;
          baseMonthlyMetric.expenses.sales.online += expenses.sales.online;

          baseMonthlyMetric.profit.total += profit.total;
          baseMonthlyMetric.profit.repair += profit.repair;
          baseMonthlyMetric.profit.sales.total += profit.sales.total;
          baseMonthlyMetric.profit.sales.inStore += profit.sales.inStore;
          baseMonthlyMetric.profit.sales.online += profit.sales.online;

          baseMonthlyMetric.revenue.total += revenue.total;
          baseMonthlyMetric.revenue.repair += revenue.repair;
          baseMonthlyMetric.revenue.sales.total += revenue.sales.total;
          baseMonthlyMetric.revenue.sales.inStore += revenue.sales.inStore;
          baseMonthlyMetric.revenue.sales.online += revenue.sales.online;

          baseMonthlyMetric.transactions.total += transactions.total;
          baseMonthlyMetric.transactions.repair += transactions.repair;
          baseMonthlyMetric.transactions.sales.total +=
            transactions.sales.total;
          baseMonthlyMetric.transactions.sales.inStore +=
            transactions.sales.inStore;
          baseMonthlyMetric.transactions.sales.online +=
            transactions.sales.online;

          dailyMetrics.forEach((storeDailyMetric) => {
            const {
              day,
              averageOrderValue,
              conversionRate,
              netProfitMargin,
              expenses,
              profit,
              revenue,
              transactions,
            } = storeDailyMetric;

            const baseDailyMetric = baseMonthlyMetric.dailyMetrics
              .find(
                (baseDailyMetric) => baseDailyMetric.day === day,
              );
            if (!baseDailyMetric) {
              return;
            }

            baseDailyMetric.averageOrderValue +=
              (baseDailyMetric.averageOrderValue +
                averageOrderValue) / 2;
            baseDailyMetric.conversionRate +=
              (baseDailyMetric.conversionRate + conversionRate) /
              2;
            baseDailyMetric.netProfitMargin +=
              (baseDailyMetric.netProfitMargin +
                netProfitMargin) / 2;

            baseDailyMetric.expenses.total += expenses.total;
            baseDailyMetric.expenses.repair += expenses.repair;
            baseDailyMetric.expenses.sales.total += expenses.sales.total;
            baseDailyMetric.expenses.sales.inStore += expenses.sales.inStore;
            baseDailyMetric.expenses.sales.online += expenses.sales.online;

            baseDailyMetric.profit.total += profit.total;
            baseDailyMetric.profit.repair += profit.repair;
            baseDailyMetric.profit.sales.total += profit.sales.total;
            baseDailyMetric.profit.sales.inStore += profit.sales.inStore;
            baseDailyMetric.profit.sales.online += profit.sales.online;

            baseDailyMetric.revenue.total += revenue.total;
            baseDailyMetric.revenue.repair += revenue.repair;
            baseDailyMetric.revenue.sales.total += revenue.sales.total;
            baseDailyMetric.revenue.sales.inStore += revenue.sales.inStore;
            baseDailyMetric.revenue.sales.online += revenue.sales.online;

            baseDailyMetric.transactions.total += transactions.total;
            baseDailyMetric.transactions.repair += transactions.repair;
            baseDailyMetric.transactions.sales.total +=
              transactions.sales.total;
            baseDailyMetric.transactions.sales.inStore +=
              transactions.sales.inStore;
            baseDailyMetric.transactions.sales.online +=
              transactions.sales.online;
          });
        });

        return baseFinancialMetricsAcc;
      },
      baseFinancialMetrics,
    );
  }

  return aggregatedAllLocationsFinancialMetrics;
}

type CreateRandomNumberInput = {
  storeLocation: StoreLocation;
  year: string;
  yearUnitsSpread: LocationYearSpread;
  defaultMin?: number;
  defaultMax?: number;
  isFraction?: boolean;
};
/**
 * - returns a random number of units sold for a specific store location and year
 */
function createRandomNumber({
  storeLocation,
  year,
  yearUnitsSpread,
  defaultMin = 3,
  defaultMax = 5,
  isFraction = false,
}: CreateRandomNumberInput) {
  const store = yearUnitsSpread[storeLocation];
  const yearSpread =
    Object.entries(store).find(([yearKey]) => yearKey === year)?.[1] ?? [
      defaultMin,
      defaultMax,
    ];
  const [min, max] = yearSpread;

  return isFraction
    ? Math.random() * (max - min) + min
    : Math.round(Math.random() * (max - min) + min);
}

type CreateProductCategoryUnitsRevenueTupleInput = {
  productCategory: ProductCategory;
  storeLocation: StoreLocation;
  year: string;
  yearUnitsSoldSpread: LocationYearSpread;
};
/**
 * - calculates the number of unitsSold and revenue for a specific product category and store location
 */
function createProductCategoryUnitsRevenueTuple({
  productCategory,
  storeLocation,
  year,
  yearUnitsSoldSpread,
}: CreateProductCategoryUnitsRevenueTupleInput) {
  const unitsSold = productCategory === "Central Processing Unit (CPU)" ||
      productCategory === "Graphics Processing Unit (GPU)" ||
      productCategory === "Motherboard" ||
      productCategory === "Headphone" ||
      productCategory === "Speaker" ||
      productCategory === "Display" ||
      productCategory === "Power Supply Unit (PSU)"
    ? createRandomNumber({
      storeLocation,
      year,
      yearUnitsSpread: yearUnitsSoldSpread,
    }) + 5
    : productCategory === "Accessory"
    ? createRandomNumber({
      storeLocation,
      year,
      yearUnitsSpread: yearUnitsSoldSpread,
    }) + 30
    : createRandomNumber({
      storeLocation,
      year,
      yearUnitsSpread: yearUnitsSoldSpread,
    }) + 7;

  const spread: Record<ProductCategory, [number, number]> = {
    "Central Processing Unit (CPU)": [100, 900],
    "Computer Case": [75, 300],
    "Desktop Computer": [700, 3000],
    Display: [150, 1500],
    "Graphics Processing Unit (GPU)": [250, 1900],
    "Memory (RAM)": [75, 500],
    "Power Supply Unit (PSU)": [75, 600],
    Accessory: [10, 250],
    Headphone: [50, 500],
    Keyboard: [50, 350],
    Microphone: [50, 300],
    Motherboard: [150, 700],
    Mouse: [50, 200],
    Speaker: [100, 600],
    Storage: [75, 500],
    Webcam: [100, 400],
  };

  const [min, max] = spread[productCategory];
  const revenue = unitsSold * Math.round(Math.random() * (max - min) + min);

  return [unitsSold, revenue];
}

type CreateRepairCategoryUnitsRepairedRevenueTupleInput = {
  repairCategory: RepairCategory;
  storeLocation: StoreLocation;
  year: string;
  yearUnitsRepairedSpread: LocationYearSpread;
};

function createRepairCategoryUnitsRepairedRevenueTuple({
  repairCategory,
  storeLocation,
  year,
  yearUnitsRepairedSpread,
}: CreateRepairCategoryUnitsRepairedRevenueTupleInput) {
  const unitsSold = createRandomNumber({
    storeLocation,
    year,
    yearUnitsSpread: yearUnitsRepairedSpread,
  });

  const spread: Record<RepairCategory, [number, number]> = {
    "Computer Component": [150, 400],
    "Electronic Device": [150, 500],
    "Mobile Device": [125, 400],
    "Audio/Video": [50, 350],
    Accessory: [50, 250],
    Peripheral: [50, 250],
  };

  const [min, max] = spread[repairCategory];
  const revenue = unitsSold * Math.round(Math.random() * (max - min) + min);

  return [unitsSold, revenue];
}

export { createRandomBusinessMetrics };
