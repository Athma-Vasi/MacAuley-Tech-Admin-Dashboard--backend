import type {
  FilterQuery,
  Model,
  MongooseBaseQueryOptionKeys,
  QueryOptions,
  RootFilterQuery,
} from "mongoose";
import { Err, None, Ok, Some } from "ts-results";
import type {
  ArrayOperators,
  FieldOperators,
  Prettify,
  QueryObjectParsedWithDefaults,
  RecordDB,
  SafeBoxResult,
} from "../types";
import mongodb = require("mongodb");

async function getResourceByIdService<
  Doc extends Record<string, unknown> = RecordDB,
>(
  resourceId: string,
  model: Prettify<Model<Doc>>,
): Promise<SafeBoxResult<Doc, unknown>> {
  try {
    const resource = await model.findById(resourceId)
      .lean()
      .exec() as Doc;

    if (resource === null || resource === undefined) {
      return new Ok({ data: None, message: Some("Resource not found") });
    }

    return new Ok({ data: Some(resource) });
  } catch (error: unknown) {
    return new Err({
      data: Some(error),
      message: Some("Error getting resource by ID"),
    });
  }
}

async function getResourceByFieldService<
  Doc extends Record<string, unknown> = RecordDB,
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
}): Promise<SafeBoxResult<Doc, unknown>> {
  try {
    const resourceBox = await model.find(filter, projection, options)
      .lean()
      .exec() as Doc[];

    if (resourceBox.length === 0 || resourceBox.length > 1) {
      return new Ok({ data: None, message: Some("Resource not found") });
    }

    return new Ok({ data: Some(resourceBox[0]) });
  } catch (error: unknown) {
    return new Err({
      data: Some(error),
      message: Some("Error getting resource by field"),
    });
  }
}

async function createNewResourceService<
  Doc extends Record<string, unknown> = RecordDB,
  Schema extends Record<string, unknown> = Record<string, unknown>,
>(
  schema: Schema,
  model: Model<Doc>,
): Promise<SafeBoxResult<Doc, unknown>> {
  try {
    const resource = await model.create(schema) as Doc;

    if (resource === null || resource === undefined) {
      return new Ok({
        data: None,
        message: Some("Created resource not found"),
      });
    }

    return new Ok({ data: Some(resource) });
  } catch (error: unknown) {
    return new Err({
      data: Some(error),
      message: Some("Error creating resource"),
    });
  }
}

async function getQueriedResourcesService<
  Doc extends Record<string, unknown> = RecordDB,
>({
  filter,
  model,
  options,
  projection,
}: QueryObjectParsedWithDefaults & {
  model: Model<Doc>;
}): Promise<SafeBoxResult<Doc[], unknown>> {
  try {
    const resources = await model.find(filter, projection, options)
      .lean()
      .exec() as Doc[];

    if (resources.length === 0) {
      return new Ok({ data: None, message: Some("Resource not found") });
    }

    return new Ok({ data: Some(resources) });
  } catch (error: unknown) {
    return new Err({
      data: Some(error),
      message: Some("Error getting resources"),
    });
  }
}

async function getQueriedTotalResourcesService<
  Doc extends Record<string, unknown> = RecordDB,
>(
  { filter, model, options }: {
    filter: RootFilterQuery<Doc> | undefined;
    model: Model<Doc>;
    options?: Pick<
      QueryOptions<Doc>,
      MongooseBaseQueryOptionKeys
    >;
  },
): Promise<SafeBoxResult<number, unknown>> {
  try {
    const totalQueriedResources = await model.countDocuments(
      filter,
      options,
    )
      .lean()
      .exec();

    if (totalQueriedResources === 0) {
      return new Ok({ data: None, message: Some("Resource not found") });
    }

    return new Ok({ data: Some(totalQueriedResources) });
  } catch (error: unknown) {
    return new Err({
      data: Some(error),
      message: Some("Error getting total resources"),
    });
  }
}

async function getQueriedResourcesByUserService<
  Doc extends Record<string, unknown> = RecordDB,
>({
  filter,
  model,
  options,
  projection,
}: QueryObjectParsedWithDefaults & {
  model: Model<Doc>;
}): Promise<SafeBoxResult<Doc[], unknown>> {
  try {
    const resources = await model.find(filter, projection, options)
      .lean()
      .exec() as Doc[];

    if (resources.length === 0) {
      return new Ok({ data: None, message: Some("Resource not found") });
    }

    return new Ok({ data: Some(resources) });
  } catch (error: unknown) {
    return new Err({
      data: Some(error),
      message: Some("Error getting resources"),
    });
  }
}

async function updateResourceByIdService<
  Doc extends Record<string, unknown> = RecordDB,
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
}): Promise<SafeBoxResult<Doc, unknown>> {
  try {
    const updateObject = {
      [updateOperator]: fields,
    };

    const resource = await model.findByIdAndUpdate(
      resourceId,
      updateObject as Pick<
        QueryOptions<Doc>,
        MongooseBaseQueryOptionKeys
      >,
      { new: true },
    )
      .lean()
      .exec() as Doc;

    if (resource === null || resource === undefined) {
      return new Ok({ data: None, message: Some("Resource not found") });
    }

    return new Ok({ data: Some(resource) });
  } catch (error: unknown) {
    return new Err({
      data: Some(error),
      message: Some("Error updating resource"),
    });
  }
}

async function deleteResourceByIdService<
  Doc extends Record<string, unknown> = RecordDB,
>(
  resourceId: string,
  model: Model<Doc>,
): Promise<SafeBoxResult<boolean, unknown>> {
  try {
    const { acknowledged, deletedCount } = await model.deleteOne({
      _id: resourceId,
    })
      .lean()
      .exec();

    return acknowledged && deletedCount === 1
      ? new Ok({ data: Some(true) })
      : new Ok({ data: None, message: Some("Resource not found") });
  } catch (error: unknown) {
    return new Err({
      data: Some(error),
      message: Some("Error deleting resource"),
    });
  }
}

async function deleteManyResourcesService<
  Doc extends Record<string, unknown> = RecordDB,
>(
  { filter, model, options }: {
    filter?: FilterQuery<Doc>;
    options?: QueryOptions<Doc>;
    model: Model<Doc>;
  },
): Promise<SafeBoxResult<boolean, unknown>> {
  try {
    const totalResources = await model.countDocuments(
      filter,
      options as unknown as Pick<
        QueryOptions<Doc>,
        MongooseBaseQueryOptionKeys
      >,
    )
      .lean()
      .exec() as number;

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
      ? new Ok({ data: Some(true) })
      : new Ok({ data: None, message: Some("Some resources not found") });
  } catch (error: unknown) {
    return new Err({
      data: Some(error),
      message: Some("Error deleting resources"),
    });
  }
}

export {
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
