import { model, Schema, type Types } from "mongoose";

type AuthSchema = {
  addressIP: string;
  expireAt?: Date; // user will be required to log in their session again after 12 hours - back up measure
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
      default: () => new Date(Date.now() + 1000 * 60 * 60 * 12), // 12 hours
      index: { expires: "12h" }, // 12 hours
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
