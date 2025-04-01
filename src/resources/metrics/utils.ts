type Month =
    | "January"
    | "February"
    | "March"
    | "April"
    | "May"
    | "June"
    | "July"
    | "August"
    | "September"
    | "October"
    | "November"
    | "December";

type Year =
    | "2013"
    | "2014"
    | "2015"
    | "2016"
    | "2017"
    | "2018"
    | "2019"
    | "2020"
    | "2021"
    | "2022"
    | "2023"
    | "2024"
    | "2025";

type DaysInMonthsInYears = Map<Year, Map<Month, string[]>>;

type ProductCategory =
    | "Accessory"
    | "Central Processing Unit (CPU)"
    | "Computer Case"
    | "Desktop Computer"
    | "Display"
    | "Graphics Processing Unit (GPU)"
    | "Headphone"
    | "Keyboard"
    | "Memory (RAM)"
    | "Microphone"
    | "Motherboard"
    | "Mouse"
    | "Power Supply Unit (PSU)"
    | "Speaker"
    | "Storage"
    | "Webcam";

type RepairCategory =
    | "Computer Component"
    | "Peripheral"
    | "Electronic Device"
    | "Mobile Device"
    | "Audio/Video"
    | "Accessory";

type StoreLocation = "Calgary" | "Edmonton" | "Vancouver";

type LocationYearSpread = Record<
    StoreLocation,
    Record<string, [number, number]>
>;

type FinancialMetricCategories = {
    total: number;
    repair: number;
    sales: {
        total: number;
        inStore: number;
        online: number;
    };
};

type YearlyFinancialMetric = {
    year: Year;
    averageOrderValue: number;
    conversionRate: number;
    netProfitMargin: number;

    expenses: FinancialMetricCategories;
    profit: FinancialMetricCategories;
    revenue: FinancialMetricCategories;
    transactions: FinancialMetricCategories;

    monthlyMetrics: MonthlyFinancialMetric[];
};

type MonthlyFinancialMetric = {
    month: Month;
    averageOrderValue: number;
    conversionRate: number;
    netProfitMargin: number;

    expenses: FinancialMetricCategories;
    profit: FinancialMetricCategories;
    revenue: FinancialMetricCategories;
    transactions: FinancialMetricCategories;

    dailyMetrics: DailyFinancialMetric[];
};

type DailyFinancialMetric = {
    day: string;
    averageOrderValue: number;
    conversionRate: number;
    netProfitMargin: number;

    expenses: FinancialMetricCategories;
    profit: FinancialMetricCategories;
    revenue: FinancialMetricCategories;
    transactions: FinancialMetricCategories;
};

type CustomerMetrics = {
    totalCustomers: number;
    lifetimeValue: number;

    yearlyMetrics: CustomerYearlyMetric[];
};

type CustomerYearlyMetric = {
    year: Year;
    customers: {
        total: number;
        new: CustomerMetricCategory;
        returning: CustomerMetricCategory;
        churnRate: number;
        retentionRate: number;
    };
    monthlyMetrics: CustomerMonthlyMetric[];
};

type CustomerMetricCategory = {
    total: number;
    sales: {
        total: number;
        online: number;
        inStore: number;
    };
    repair: number;
};

type CustomerMonthlyMetric = {
    month: Month;
    customers: {
        total: number;
        new: CustomerMetricCategory;
        returning: CustomerMetricCategory;
        churnRate: number;
        retentionRate: number;
    };
    dailyMetrics: CustomerDailyMetric[];
};

type CustomerDailyMetric = {
    day: string;
    customers: {
        total: number;
        new: CustomerMetricCategory;
        returning: CustomerMetricCategory;
        churnRate: number;
        retentionRate: number;
    };
};

type ProductMetric = {
    name: ProductCategory | "All Products";
    yearlyMetrics: ProductYearlyMetric[];
};

type ProductMetricCategory = {
    total: number;
    online: number;
    inStore: number;
};

type ProductYearlyMetric = {
    year: Year;
    revenue: ProductMetricCategory;
    unitsSold: ProductMetricCategory;

    monthlyMetrics: ProductMonthlyMetric[];
};

type ProductMonthlyMetric = {
    month: Month;
    revenue: ProductMetricCategory;
    unitsSold: ProductMetricCategory;

    dailyMetrics: ProductDailyMetric[];
};

type ProductDailyMetric = {
    day: string;
    revenue: ProductMetricCategory;
    unitsSold: ProductMetricCategory;
};

type RepairMetric = {
    name: RepairCategory | "All Repairs";
    yearlyMetrics: RepairYearlyMetric[];
};

type RepairYearlyMetric = {
    year: Year;
    revenue: number;
    unitsRepaired: number;

    monthlyMetrics: RepairMonthlyMetric[];
};

type RepairMonthlyMetric = {
    month: Month;
    revenue: number;
    unitsRepaired: number;

    dailyMetrics: RepairDailyMetric[];
};

type RepairDailyMetric = {
    day: string;
    revenue: number;
    unitsRepaired: number;
};

type BusinessMetricStoreLocation = "All Locations" | StoreLocation;

type BusinessMetric = {
    storeLocation: BusinessMetricStoreLocation;
    customerMetrics: CustomerMetrics;
    financialMetrics: YearlyFinancialMetric[];
    productMetrics: ProductMetric[];
    repairMetrics: RepairMetric[];
};

export type {
    BusinessMetric,
    BusinessMetricStoreLocation,
    CustomerDailyMetric,
    CustomerMetricCategory,
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
    ProductMetricCategory,
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
};
