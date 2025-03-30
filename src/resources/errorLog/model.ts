import { model, Schema, Types } from "mongoose";

type ErrorLogSchema = {
  expireAt: Date;
  message: string;
  name: string;
  requestBody: string;
  sessionId: string;
  stack: string;
  timestamp: Date;
  userId: string;
  username: string;
};

type ErrorLogDocument = ErrorLogSchema & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
};

const errorLogSchema = new Schema(
  {
    expireAt: {
      type: Date,
      required: false,
      default: Date.now,
      index: { expires: "30d" }, // document will expire in 30 days
    },
    userId: {
      type: String,
      required: [true, "User ID is required"],
      ref: "User",
      index: true,
    },
    username: {
      type: String,
      required: false,
      default: "Username was not provided",
    },
    sessionId: {
      type: String,
      required: false,
      default: "Session ID was not provided",
      index: true,
    },
    message: {
      type: String,
      required: false,
      default: "Message was not provided",
    },
    name: {
      type: String,
      required: false,
      default: "Error name was not provided",
    },
    stack: {
      type: String,
      required: false,
      default: "Stack trace was not provided",
    },
    requestBody: {
      type: String,
      required: false,
      default: "Request body was not provided",
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
  username: "text",
  sessionId: "text",
  message: "text",
  stack: "text",
  requestBody: "text",
});

const ErrorLogModel = model<ErrorLogDocument>("ErrorLog", errorLogSchema);

export { ErrorLogDocument, ErrorLogModel, ErrorLogSchema };
