import { model, Schema, type Types } from "mongoose";
import { AUTH_SESSION_EXPIRY } from "./constants";

type AuthSchema = {
  // this is the token that is currently active for the user associated with this session
  currentlyActiveToken: string;
  addressIP: string;
  expireAt?: Date; // user will be required to log in their session again after 3 hours - back up measure
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
    currentlyActiveToken: {
      type: String,
      required: [true, "Currently Active Token is required"],
    },
    addressIP: {
      type: String,
      required: [true, "IP Address is required"],
    },
    expireAt: {
      type: Date,
      default: () => new Date(AUTH_SESSION_EXPIRY), // 3 hours
      // index: { expires: "1m" }, // 1 hour
      expires: "1h",
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
