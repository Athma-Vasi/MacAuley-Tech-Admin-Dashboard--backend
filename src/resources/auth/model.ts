import { model, Schema, Types } from "mongoose";

type AuthSchema = {
  addressIP: string;
  expireAt: Date; // user will be required to log in their session again after 1 day - back up measure
  isValid: boolean;
  userAgent: string;
  userId: Types.ObjectId;
  username: string;
};

type AuthDocument = AuthSchema & {
  _id: Types.ObjectId; // will be the sessionId in token payload
  createdAt: Date;
  updatedAt: Date;
  __v: number;
};

const authSchema = new Schema(
  {
    addressIP: {
      type: String,
      required: [true, "IP Address is required"],
    },
    expireAt: {
      type: Date,
      default: Date.now,
      index: { expires: "1d" }, // 1 day
    },
    isValid: {
      type: Boolean,
      default: true,
    },
    userAgent: {
      type: String,
      required: [true, "User Agent is required"],
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: [true, "User ID is required"],
      ref: "User",
      index: true,
    },
    username: {
      type: String,
      required: [true, "Username is required"],
    },
  },
  { timestamps: true },
);

authSchema.index({ username: "text", userAgent: "text", addressIP: "text" });

const AuthModel = model<AuthDocument>("Auth", authSchema);

export { AuthModel };
export type { AuthDocument, AuthSchema };
