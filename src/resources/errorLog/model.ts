import { model, Schema, type Types } from "mongoose";
import { ERROR_LOG_EXPIRY } from "./constants";

type ErrorLogSchema = {
  method?: string;
  path?: string;
  headers?: string;
  body?: string;
  ip?: string;
  userAgent?: string;
  original: string;
  expireAt?: Date;
  userId: string;
  username: string;
  sessionId: string;
  message: string;
  name: string;
  stack: string;
  timestamp?: Date;
};

type ErrorLogDocument = ErrorLogSchema & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
};

const errorLogSchema = new Schema(
  {
    method: {
      type: String,
      required: false,
    },
    path: {
      type: String,
      required: false,
    },
    headers: {
      type: String,
      required: false,
    },
    body: {
      type: String,
      required: false,
    },
    ip: {
      type: String,
      required: false,
    },
    userAgent: {
      type: String,
      required: false,
    },
    original: {
      type: String,
      required: [true, "Original error is required"],
    },
    expireAt: {
      type: Date,
      required: false,
      default: () => new Date(ERROR_LOG_EXPIRY), // 7 days
    },
    userId: {
      type: String,
      required: [true, "User ID is required"],
      ref: "User",
      index: true,
    },
    username: {
      type: String,
      required: [true, "Username is required"],
    },
    sessionId: {
      type: String,
      required: [true, "Session ID is required"],
      index: true,
    },
    message: {
      type: String,
      required: [true, "Message is required"],
    },
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    stack: {
      type: String,
      required: [true, "Stack is required"],
    },
    timestamp: {
      type: Date,
      required: false,
      default: Date.now(),
    },
  },
  { timestamps: true },
);

errorLogSchema.index({
  body: "text",
  headers: "text",
  ip: "text",
  message: "text",
  method: "text",
  path: "text",
  sessionId: "text",
  stack: "text",
  userAgent: "text",
  username: "text",
});

const ErrorLogModel = model<ErrorLogDocument>("ErrorLog", errorLogSchema);

export { type ErrorLogDocument, ErrorLogModel, type ErrorLogSchema };
