import type {
    FilterQuery,
    Model,
    MongooseBaseQueryOptionKeys,
    QueryOptions,
} from "mongoose";
import { Err, Ok, type Result } from "ts-results";
import type {
    ArrayOperators,
    DBRecord,
    FieldOperators,
    QueryObjectParsedWithDefaults,
    ServiceOutput,
    ServiceResult,
} from "../types";

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

async function createNewResourceService<
    Schema extends Record<string, unknown> = Record<string, unknown>,
    Doc extends DBRecord = DBRecord,
>(
    schema: Schema,
    model: Model<Doc>,
): ServiceResult<Doc> {
    try {
        const resource = await model.create(schema);
        return new Ok({
            data: resource,
            kind: "success",
        }) as unknown as ServiceResult<Doc>;
    } catch (error: unknown) {
        return new Err({ data: error, kind: "error" });
    }
}

async function createAndNotReturnResourceService<
    Doc extends DBRecord = DBRecord,
    Schema extends Record<string, unknown> = Record<string, unknown>,
>(
    schema: Schema,
    model: Model<Doc>,
): Promise<Result<ServiceOutput<boolean>, ServiceOutput<unknown>>> {
    try {
        await model.create(schema);
        return new Ok({ data: true, kind: "success" });
    } catch (error: unknown) {
        return new Err({ data: error, kind: "error" });
    }
}

async function getQueriedResourcesService<
    Doc extends DBRecord = DBRecord,
>({
    filter = {},
    model,
    options,
    projection,
}: QueryObjectParsedWithDefaults & {
    model: Model<Doc>;
}): ServiceResult<Doc[]> {
    try {
        const resources = await model.find(filter, projection, options)
            .lean()
            .exec();

        if (resources.length === 0) {
            return new Ok({ kind: "notFound" });
        }

        return new Ok({
            data: resources,
            kind: "success",
        }) as unknown as ServiceResult<Doc[]>;
    } catch (error: unknown) {
        return new Err({ data: error, kind: "error" });
    }
}

async function getQueriedTotalResourcesService<
    Doc extends DBRecord = DBRecord,
>(
    { filter, model, options }: {
        filter: FilterQuery<Doc> | undefined;
        model: Model<Doc>;
        options?: QueryOptions<Doc> | undefined;
    },
): Promise<Result<ServiceOutput<number>, ServiceOutput<unknown>>> {
    try {
        const totalQueriedResources = await model.countDocuments(
            filter,
            options as unknown as Pick<
                QueryOptions<Doc>,
                MongooseBaseQueryOptionKeys
            >,
        )
            .lean()
            .exec();
        return new Ok({ data: totalQueriedResources, kind: "success" });
    } catch (error: unknown) {
        return new Err({ data: error, kind: "error" });
    }
}

async function getQueriedResourcesByUserService<
    Doc extends DBRecord = DBRecord,
>({
    filter = {},
    model,
    options = {},
    projection = null,
}: QueryObjectParsedWithDefaults & {
    model: Model<Doc>;
}): ServiceResult<Doc[]> {
    try {
        const resources = await model.find(filter, projection, options)
            .lean()
            .exec();

        if (resources.length === 0) {
            return new Ok({ kind: "notFound" });
        }

        return new Ok({
            data: resources,
            kind: "success",
        }) as unknown as ServiceResult<Doc[]>;
    } catch (error: unknown) {
        return new Err({ data: error, kind: "error" });
    }
}

async function updateResourceByIdService<
    Doc extends DBRecord = DBRecord,
>({
    resourceId,
    fields,
    updateOperator,
    model,
}: {
    resourceId: string;
    fields: Record<string, unknown>;
    model: Model<Doc>;
    updateOperator: FieldOperators | ArrayOperators;
}): ServiceResult<Doc> {
    try {
        const updateString = `{ "${updateOperator}":  ${
            JSON.stringify(fields)
        } }`;
        const updateObject = JSON.parse(updateString);

        const resource = await model.findByIdAndUpdate(
            resourceId,
            updateObject,
            { new: true },
        )
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

async function deleteResourceByIdService<
    Doc extends DBRecord = DBRecord,
>(
    resourceId: string,
    model: Model<Doc>,
): Promise<Result<ServiceOutput<boolean>, ServiceOutput<unknown>>> {
    try {
        const { acknowledged, deletedCount } = await model.deleteOne({
            _id: resourceId,
        })
            .lean()
            .exec();

        return acknowledged && deletedCount === 1
            ? new Ok({ data: true, kind: "success" })
            : new Ok({ data: false, kind: "error" });
    } catch (error: unknown) {
        return new Err({ data: error, kind: "error" });
    }
}

async function deleteManyResourcesService<
    Doc extends DBRecord = DBRecord,
>(
    { filter, model, options }: {
        filter?: FilterQuery<Doc>;
        options?: QueryOptions<Doc>;
        model: Model<Doc>;
    },
): Promise<Result<ServiceOutput<boolean>, ServiceOutput<unknown>>> {
    try {
        const totalResources = await model.countDocuments(
            filter,
            options as unknown as Pick<
                QueryOptions<Doc>,
                MongooseBaseQueryOptionKeys
            >,
        )
            .lean()
            .exec();
        const { acknowledged, deletedCount } = await model.deleteMany(
            filter,
            options as unknown as Pick<
                QueryOptions<Doc>,
                MongooseBaseQueryOptionKeys
            >,
        )
            .lean()
            .exec();

        return acknowledged && deletedCount === totalResources
            ? new Ok({ data: true, kind: "success" })
            : new Ok({ data: false, kind: "error" });
    } catch (error: unknown) {
        return new Err({ data: error, kind: "error" });
    }
}

export {
    createAndNotReturnResourceService,
    createNewResourceService,
    deleteManyResourcesService,
    deleteResourceByIdService,
    getQueriedResourcesByUserService,
    getQueriedResourcesService,
    getQueriedTotalResourcesService,
    getResourceByFieldService,
    getResourceByIdService,
    updateResourceByIdService,
};
