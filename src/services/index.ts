import { FilterQuery, Model, QueryOptions } from "mongoose";
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

async function getResourceByFieldService<
    Doc extends DBRecord = DBRecord,
>({
    filter,
    model,
    projection,
    options,
}: {
    filter: FilterQuery<Doc>;
    model: Model<Doc>;
    projection?: Record<string, unknown>;
    options?: QueryOptions<Doc>;
}): ServiceResult<Doc> {
    try {
        const resourceBox = await model.find(filter, projection, options)
            .lean()
            .exec();

        if (resourceBox.length === 0 || resourceBox.length > 1) {
            return new Ok({ kind: "notFound" });
        }

        return new Ok({
            data: resourceBox[0],
            kind: "success",
        }) as unknown as ServiceResult<Doc>;
    } catch (error: unknown) {
        return new Err({ data: error, kind: "error" });
    }
}
