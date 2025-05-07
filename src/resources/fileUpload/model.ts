import { model, Schema, type Types } from "mongoose";
import { FILE_UPLOAD_EXPIRY } from "../../constants";

type FileExtension = "jpeg" | "png" | "jpg" | "webp";

type FileUploadSchema = {
    userId: Types.ObjectId;
    uploadedFile: Buffer;
    username: string;
    expireAt?: Date;
    fileExtension: FileExtension;
    fileName: string;
    fileSize: number;
    fileMimeType: string;
    fileEncoding: string;
};

type FileUploadDocument = FileUploadSchema & {
    _id: Types.ObjectId;
    associatedDocumentId?: Types.ObjectId | string;
    createdAt: Date;
    updatedAt: Date;
    __v: number;
};

const fileUploadSchema = new Schema<FileUploadDocument>(
    {
        expireAt: {
            type: Date,
            default: () => new Date(FILE_UPLOAD_EXPIRY), // 1 hour
            // index: { expires: "1m" }, // 1 hour
            expires: "1h",
        },
        associatedDocumentId: {
            type: String,
            required: false,
        },
        userId: {
            type: Schema.Types.ObjectId,
            required: [true, "User Id is required"],
            ref: "User",
            index: true,
        },
        uploadedFile: {
            type: Buffer,
            required: [true, "Uploaded file is required"],
        },
        username: {
            type: String,
            required: [true, "Username is required"],
        },

        fileExtension: {
            type: String,
            required: [true, "File extension is required"],
            index: true,
        },
        fileName: {
            type: String,
            required: [true, "File name is required"],
        },
        fileSize: {
            type: Number,
            required: [true, "File size is required"],
        },
        fileMimeType: {
            type: String,
            required: [true, "File MIME type is required"],
        },
        fileEncoding: {
            type: String,
            required: [true, "File encoding is required"],
        },
    },
    {
        timestamps: true,
    },
);

// text index for searching
fileUploadSchema.index({
    username: "text",
    fileMimeType: "text",
    fileEncoding: "text",
});

const FileUploadModel = model(
    "FileUpload",
    fileUploadSchema,
);

export { FileUploadModel };
export type { FileExtension, FileUploadDocument, FileUploadSchema };
