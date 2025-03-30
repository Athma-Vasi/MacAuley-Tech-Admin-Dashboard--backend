import { model, Schema, Types } from "mongoose";
import { UserDocument } from ".";

type UserRoles = ("Admin" | "Employee" | "Manager")[];

type Province =
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
type PhoneNumber =
  `+(${string})(${string}${string}${string}) ${string}${string}${string}-${string}${string}${string}${string}`;
type Country = "Canada" | "United States";
type StoreLocation = "Calgary" | "Edmonton" | "Vancouver" | "Corporate";

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
  | "Parts and Materials Controller"
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

type Address = {
  addressLine: string;
  city: string;
  province?: Province;
  state?: StatesUS;
  postalCode: PostalCode;
  country: Country;
};

type UserSchema = {
  username: string;
  password: string;
  email: string;

  firstName: string;
  middleName: string;
  lastName: string;
  preferredName: string;
  profilePictureUrl: string;
  dateOfBirth: Date;

  contactNumber: PhoneNumber;
  address: Address;

  jobPosition: JobPosition;
  department: Department;
  storeLocation: StoreLocation;

  emergencyContact: { fullName: string; contactNumber: PhoneNumber };
  startDate: Date;
  roles: UserRoles;
  active: boolean;

  completedSurveys: (Types.ObjectId | string)[];
  isPrefersReducedMotion: boolean;
};

type UserDocument = UserSchema & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
};

const userSchema = new Schema<UserDocument>(
  {
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
      index: true,
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
    },
    middleName: {
      type: String,
      required: false,
      default: "",
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
    },
    preferredName: {
      type: String,
      required: false,
      default: "",
    },
    profilePictureUrl: {
      type: String,
      required: false,
      default: "",
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },

    contactNumber: {
      type: String,
      required: [true, "Contact number is required"],
    },
    address: {
      addressLine: {
        type: String,
        required: [true, "Address line 1 is required"],
      },
      city: {
        type: String,
        required: [true, "City is required"],
      },
      province: {
        type: String,
        required: false,
        index: true,
      },
      state: {
        type: String,
        required: false,
        index: true,
      },
      postalCode: {
        type: String,
        required: [true, "Postal code is required"],
      },
      country: {
        type: String,
        required: [true, "Country is required"],
        index: true,
      },
    },

    jobPosition: {
      type: String,
      required: [true, "Job position is required"],
      index: true,
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      index: true,
    },
    storeLocation: {
      type: String,
      required: false,
      index: true,
    },

    emergencyContact: {
      fullName: {
        type: String,
        required: [true, "Emergency contact full name is required"],
      },
      contactNumber: {
        type: String,
        required: [true, "Emergency contact number is required"],
      },
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    roles: {
      type: [String],
      required: false,
      default: ["Employee"],
      index: true,
    },
    active: {
      type: Boolean,
      required: [true, "Active status is required"],
      default: true,
      index: true,
    },

    completedSurveys: {
      type: [Schema.Types.ObjectId],
      ref: "SurveyBuilder",
      required: false,
      default: [],
      index: true,
    },
    isPrefersReducedMotion: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// text index for searching
userSchema.index({
  username: "text",
  email: "text",
  firstName: "text",
  middleName: "text",
  lastName: "text",
  preferredName: "text",
  contactNumber: "text",
  "address.addressLine": "text",
  "address.city": "text",
  "address.postalCode": "text",
  emergencyContact: "text",
  "emergencyContact.fullName": "text",
  "emergencyContact.contactNumber": "text",
});

const UserModel = model("User", userSchema);

export { UserModel };
export type {
  Address,
  Country,
  Department,
  JobPosition,
  PhoneNumber,
  PostalCode,
  Province,
  StatesUS,
  StoreLocation,
  UserDocument,
  UserRoles,
  UserSchema,
};
