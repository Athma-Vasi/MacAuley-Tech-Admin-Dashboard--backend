import { model, Schema, type Types } from "mongoose";
import { NEW_USER_EXPIRY } from "../../constants";
import type { StoreLocation } from "../metrics/types";

type UserRoles = ("Admin" | "Employee" | "Manager")[];

type Province =
  | "Not Applicable"
  | "Alberta"
  | "British Columbia"
  | "Manitoba"
  | "New Brunswick"
  | "Newfoundland and Labrador"
  | "Northwest Territories"
  | "Nova Scotia"
  | "Nunavut"
  | "Ontario"
  | "Prince Edward Island"
  | "Quebec"
  | "Saskatchewan"
  | "Yukon";

type StatesUS =
  | "Not Applicable"
  | "Alabama"
  | "Alaska"
  | "Arizona"
  | "Arkansas"
  | "California"
  | "Colorado"
  | "Connecticut"
  | "Delaware"
  | "Florida"
  | "Georgia"
  | "Hawaii"
  | "Idaho"
  | "Illinois"
  | "Indiana"
  | "Iowa"
  | "Kansas"
  | "Kentucky"
  | "Louisiana"
  | "Maine"
  | "Maryland"
  | "Massachusetts"
  | "Michigan"
  | "Minnesota"
  | "Mississippi"
  | "Missouri"
  | "Montana"
  | "Nebraska"
  | "Nevada"
  | "New Hampshire"
  | "New Jersey"
  | "New Mexico"
  | "New York"
  | "North Carolina"
  | "North Dakota"
  | "Ohio"
  | "Oklahoma"
  | "Oregon"
  | "Pennsylvania"
  | "Rhode Island"
  | "South Carolina"
  | "South Dakota"
  | "Tennessee"
  | "Texas"
  | "Utah"
  | "Vermont"
  | "Virginia"
  | "Washington"
  | "West Virginia"
  | "Wisconsin"
  | "Wyoming";

type CanadianPostalCode =
  `${string}${string}${string} ${string}${string}${string}`;
type USPostalCode = `${string}${string}${string}${string}${string}`;
type PostalCode = CanadianPostalCode | USPostalCode;

type Country = "Canada" | "United States";

type Department =
  | "Executive Management"
  | "Store Administration"
  | "Office Administration"
  | "Accounting"
  | "Human Resources"
  | "Sales"
  | "Marketing"
  | "Information Technology"
  | "Repair Technicians"
  | "Field Service Technicians"
  | "Logistics and Inventory"
  | "Customer Service"
  | "Maintenance";

type ExecutiveManagement =
  | "Chief Executive Officer"
  | "Chief Operations Officer"
  | "Chief Financial Officer"
  | "Chief Technology Officer"
  | "Chief Marketing Officer"
  | "Chief Sales Officer"
  | "Chief Human Resources Officer";

type HumanResources =
  | "Human Resources Manager"
  | "Compensation and Benefits Specialist"
  | "Health and Safety Specialist"
  | "Training Specialist"
  | "Recruiting Specialist";

type StoreAdministration =
  | "Store Manager"
  | "Shift Supervisor"
  | "Office Manager";

type OfficeAdministration =
  | "Office Administrator"
  | "Receptionist"
  | "Data Entry Specialist";

type Accounting =
  | "Accounting Manager"
  | "Accounts Payable Clerk"
  | "Accounts Receivable Clerk"
  | "Financial Analyst";

type Sales =
  | "Sales Manager"
  | "Sales Representative"
  | "Business Development Specialist"
  | "Sales Support Specialist"
  | "Sales Operations Analyst";

type Marketing =
  | "Marketing Manager"
  | "Digital Marketing Specialist"
  | "Graphic Designer"
  | "Public Relations Specialist"
  | "Marketing Analyst";

type InformationTechnology =
  | "IT Manager"
  | "Systems Administrator"
  | "IT Support Specialist"
  | "Database Administrator"
  | "Web Developer"
  | "Software Developer"
  | "Software Engineer";

type RepairTechnicians =
  | "Repair Technicians Supervisor"
  | "Electronics Technician"
  | "Computer Technician"
  | "Smartphone Technician"
  | "Tablet Technician"
  | "Audio/Video Equipment Technician";

type FieldServiceTechnicians =
  | "Field Service Supervisor"
  | "On-Site Technician";

type LogisticsAndInventory =
  | "Warehouse Supervisor"
  | "Inventory Clerk"
  | "Delivery Driver"
  | "Parts and Materials Handler"
  | "Shipper/Receiver";

type CustomerService =
  | "Customer Service Supervisor"
  | "Customer Service Representative"
  | "Technical Support Specialist";

type Maintenance =
  | "Maintenance Supervisor"
  | "Maintenance Worker"
  | "Custodian";

type JobPosition =
  | ExecutiveManagement
  | StoreAdministration
  | OfficeAdministration
  | Sales
  | Marketing
  | InformationTechnology
  | RepairTechnicians
  | FieldServiceTechnicians
  | LogisticsAndInventory
  | CustomerService
  | HumanResources
  | Accounting
  | Maintenance;

type AllStoreLocations = "All Locations" | StoreLocation;

type UserSchema = {
  addressLine: string;
  city: string;
  country: Country;
  department: Department;
  email: string;
  expireAt?: Date;
  firstName: string;
  jobPosition: JobPosition;
  lastName: string;
  orgId: number;
  parentOrgId: number;
  password: string;
  postalCodeCanada: CanadianPostalCode;
  postalCodeUS: USPostalCode;
  profilePictureUrl?: string;
  province: Province;
  roles: UserRoles;
  state: StatesUS;
  storeLocation: AllStoreLocations;
  username: string;
};

type UserDocument = UserSchema & {
  _id: Types.ObjectId;
  createdAt: Date;
  fileUploadId?: Types.ObjectId | string;
  updatedAt: Date;
  __v: number;
};

const userSchema = new Schema<UserDocument>(
  {
    expireAt: {
      type: Date,
      default: () => new Date(NEW_USER_EXPIRY), // 1 hour
      // index: { expires: "1m" }, // 1 hour
      expires: "1h",
    },
    fileUploadId: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "FileUpload",
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
    },
    addressLine: {
      type: String,
      required: [true, "Address line is required"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      enum: ["Canada", "United States"],
    },
    postalCodeCanada: {
      type: String,
      default: "A0A 0A0",
      required: [true, "Postal code is required"],
    },
    postalCodeUS: {
      type: String,
      required: [true, "Postal code is required"],
      default: "00000",
    },
    province: {
      type: String,
      required: [true, "Province is required"],
      default: "Not Applicable",
    },
    state: {
      type: String,
      required: [true, "State is required"],
      default: "Not Applicable",
    },
    department: {
      type: String,
      required: [true, "Department is required"],
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
    },
    jobPosition: {
      type: String,
      required: [true, "Job position is required"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
    },
    profilePictureUrl: {
      type: String,
      required: false,
      default: "",
    },
    storeLocation: {
      type: String,
      default: "All Locations",
    },
    orgId: {
      type: Number,
      required: [true, "Organization ID is required"],
    },
    parentOrgId: {
      type: Number,
      required: [true, "Parent organization ID is required"],
    },
    roles: {
      type: [String],
      enum: ["Admin", "Employee", "Manager"],
      default: ["Employee"],
    },
  },
  {
    timestamps: true,
  },
);

// text index for searching
userSchema.index({
  city: "text",
  username: "text",
  email: "text",
  addressLine: "text",
  firstName: "text",
  lastName: "text",
});

const UserModel = model("User", userSchema);

export { UserModel };
export type { UserDocument, UserRoles, UserSchema };
