import type {
  FilterQuery,
  Model,
  MongooseBaseQueryOptionKeys,
  QueryOptions,
} from "mongoose";
import { Err, Ok } from "ts-results";
import type {
  ArrayOperators,
  DBRecord,
  FieldOperators,
  QueryObjectParsedWithDefaults,
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
      return new Ok({ data: [], kind: "notFound" });
    }

    return new Ok({
      data: [resource],
      kind: "success",
    }) as unknown as ServiceResult<Doc>;
  } catch (error: unknown) {
    return new Err({
      data: error,
      message: "Error getting resource",
    });
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
      return new Ok({ data: [], kind: "notFound" });
    }

    return new Ok({
      data: resourceBox,
      kind: "success",
    }) as unknown as ServiceResult<Doc>;
  } catch (error: unknown) {
    return new Err({ data: error, message: "Error getting resource" });
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

    console.group(
      "createNewResourceService",
    );
    console.log("resource:", resource);
    console.groupEnd();

    return new Ok({
      data: [resource],
      kind: "success",
    }) as unknown as ServiceResult<Doc>;
  } catch (error: unknown) {
    return new Err({ data: error, message: "Error creating resource" });
  }
}

async function createAndNotReturnResourceService<
  Schema extends Record<string, unknown> = Record<string, unknown>,
  Doc extends DBRecord = DBRecord,
>(
  schema: Schema,
  model: Model<Doc>,
): ServiceResult<boolean> {
  try {
    await model.create(schema);
    return new Ok({
      data: [true],
      kind: "success",
    }) as unknown as ServiceResult<boolean>;
  } catch (error: unknown) {
    return new Err({ data: error, message: "Error creating resource" });
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
      return new Ok({ data: [], kind: "notFound" });
    }

    return new Ok({
      data: resources,
      kind: "success",
    }) as unknown as ServiceResult<Doc[]>;
  } catch (error: unknown) {
    return new Err({ data: error, message: "Error getting resources" });
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
): ServiceResult<Doc> {
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

    if (totalQueriedResources === 0) {
      return new Ok({ data: [], kind: "notFound" });
    }

    return new Ok({
      data: totalQueriedResources,
      kind: "success",
    }) as unknown as ServiceResult<Doc>;
  } catch (error: unknown) {
    return new Err({ data: error, message: "Error getting total resources" });
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
      return new Ok({ data: [], kind: "notFound" });
    }

    return new Ok({
      data: resources,
      kind: "success",
    }) as unknown as ServiceResult<Doc[]>;
  } catch (error: unknown) {
    return new Err({ data: error, message: "Error getting resources" });
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
    const updateString = `{ "${updateOperator}":  ${JSON.stringify(fields)} }`;
    const updateObject = JSON.parse(updateString);

    const resource = await model.findByIdAndUpdate(
      resourceId,
      updateObject,
      { new: true },
    )
      .lean()
      .exec();

    if (resource === null || resource === undefined) {
      return new Ok({ data: [], kind: "notFound" });
    }

    return new Ok({
      data: [resource],
      kind: "success",
    }) as unknown as ServiceResult<Doc>;
  } catch (error: unknown) {
    return new Err({ data: error, message: "Error updating resource" });
  }
}

async function deleteResourceByIdService<
  Doc extends DBRecord = DBRecord,
>(
  resourceId: string,
  model: Model<Doc>,
): ServiceResult<boolean> {
  try {
    const { acknowledged, deletedCount } = await model.deleteOne({
      _id: resourceId,
    })
      .lean()
      .exec();

    return acknowledged && deletedCount === 1
      ? new Ok({ data: [true], kind: "success" }) as unknown as ServiceResult<
        boolean
      >
      : new Ok({
        data: [false],
        kind: "mildError",
      }) as unknown as ServiceResult<boolean>;
  } catch (error: unknown) {
    return new Err({ data: error, message: "Error deleting resource" });
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
): ServiceResult<boolean> {
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

    console.group(
      "deleteManyResourcesService",
    );
    console.log("totalResources:", totalResources);
    console.log("acknowledged:", acknowledged);
    console.log("deletedCount:", deletedCount);
    console.groupEnd();

    return acknowledged && deletedCount === totalResources
      ? new Ok({ data: [true], kind: "success" }) as unknown as ServiceResult<
        boolean
      >
      : new Ok({
        data: [false],
        kind: "mildError",
      }) as unknown as ServiceResult<boolean>;
  } catch (error: unknown) {
    return new Err({ data: error, message: "Error deleting resources" });
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
