import { model, Schema, type Types } from "mongoose";

type UserRoles = ("Admin" | "Employee" | "Manager")[];

type UserSchema = {
  username: string;
  password: string;
  email: string;
  roles: UserRoles;
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
  username: "text",
  email: "text",
});

const UserModel = model("User", userSchema);

export { UserModel };
export type { UserDocument, UserRoles, UserSchema };
