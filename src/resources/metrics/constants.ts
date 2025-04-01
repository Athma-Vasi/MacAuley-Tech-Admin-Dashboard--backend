import type {
  Month,
  ProductCategory,
  RepairCategory,
  StoreLocation,
} from "./types";

const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const MONTHS: Month[] = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const PRODUCT_CATEGORIES: ProductCategory[] = [
  "Accessory",
  "Central Processing Unit (CPU)",
  "Computer Case",
  "Desktop Computer",
  "Display",
  "Graphics Processing Unit (GPU)",
  "Headphone",
  "Keyboard",
  "Memory (RAM)",
  "Microphone",
  "Motherboard",
  "Mouse",
  "Power Supply Unit (PSU)",
  "Speaker",
  "Storage",
  "Webcam",
];

const REPAIR_CATEGORIES: RepairCategory[] = [
  "Accessory",
  "Audio/Video",
  "Computer Component",
  "Electronic Device",
  "Mobile Device",
  "Peripheral",
];

const STORE_LOCATIONS: StoreLocation[] = ["Calgary", "Edmonton", "Vancouver"];

export {
  DAYS_PER_MONTH,
  MONTHS,
  PRODUCT_CATEGORIES,
  REPAIR_CATEGORIES,
  STORE_LOCATIONS,
};
