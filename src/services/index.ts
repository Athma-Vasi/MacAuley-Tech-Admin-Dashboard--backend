import { Model } from "mongoose";
import { Err, Ok } from "ts-results";
import { DBRecord, ServiceResult } from "../types";

async function getResourceByIdService<
    Doc extends DBRecord = DBRecord,
>(
    resourceId: string,
    model: Model<Doc>,
): ServiceResult<Doc> {
    try {
        const resource = await model.findById(resourceId)
            .lean()
            .exec();

        if (resource === null || resource === undefined) {
            return new Ok({ kind: "notFound" });
        }

        return new Ok({
            data: resource,
            kind: "success",
        }) as unknown as ServiceResult<Doc>;
    } catch (error: unknown) {
        return new Err({ data: error, kind: "error" });
    }
}
