import Joi from "joi";
import {
    FILE_ENCODING_REGEX,
    FILE_EXTENSIONS_REGEX,
    FILE_MIME_TYPES_REGEX,
    FILE_NAME_REGEX,
} from "../../regex";

const createFileUploadJoiSchema = Joi.object({
    associatedDocumentId: Joi.string(),
    uploadedFile: Joi.binary().required(),
    fileExtension: Joi.string().regex(FILE_EXTENSIONS_REGEX).required(),
    fileName: Joi.string().regex(FILE_NAME_REGEX).required(),
    fileSize: Joi.number().max(1_000_000).required(),
    fileMimeType: Joi.string().regex(FILE_MIME_TYPES_REGEX).required(),
    fileEncoding: Joi.string().regex(FILE_ENCODING_REGEX).required(),
});

export { createFileUploadJoiSchema };
