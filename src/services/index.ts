import type {
  FilterQuery,
  Model,
  MongooseBaseQueryOptionKeys,
  QueryOptions,
  RootFilterQuery,
} from "mongoose";
import { None, Ok } from "ts-results";
import type {
  ArrayOperators,
  FieldOperators,
  Prettify,
  QueryObjectParsedWithDefaults,
  RecordDB,
  SafeResult,
} from "../types";
import { createSafeErrorResult, createSafeSuccessResult } from "../utils";

async function getResourceByIdService<
  Doc extends Record<string, unknown> = RecordDB,
>(
  resourceId: string,
  model: Prettify<Model<Doc>>,
): Promise<SafeResult<Doc>> {
  try {
    const resource = await model.findById(resourceId)
      .lean()
      .exec() as Doc;
    return createSafeSuccessResult(resource);
  } catch (error: unknown) {
    return createSafeErrorResult(error);
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
}): Promise<SafeResult<Doc>> {
  try {
    const resourceBox = await model.find(filter, projection, options)
      .lean()
      .exec() as Doc[];

    return resourceBox.length === 0 || resourceBox[0] == null
      ? new Ok(None)
      : createSafeSuccessResult(resourceBox[0]);
  } catch (error: unknown) {
    return createSafeErrorResult(error);
  }
}

async function createNewResourceService<
  Schema extends Record<string, unknown> = Record<string, unknown>,
  Doc extends Record<string, unknown> = RecordDB,
>(
  schema: Schema,
  model: Model<Doc>,
): Promise<SafeResult<Doc>> {
  try {
    const resource = await model.create(schema) as Doc;
    return createSafeSuccessResult(resource);
  } catch (error: unknown) {
    return createSafeErrorResult(error);
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
}): Promise<SafeResult<Doc[]>> {
  try {
    const resources = await model.find(filter, projection, options)
      .lean()
      .exec() as Doc[];
    return createSafeSuccessResult(resources);
  } catch (error: unknown) {
    return createSafeErrorResult(error);
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
): Promise<SafeResult<number>> {
  try {
    const totalQueriedResources = await model.countDocuments(
      filter,
      options,
    )
      .lean()
      .exec();
    return createSafeSuccessResult(totalQueriedResources);
  } catch (error: unknown) {
    return createSafeErrorResult(error);
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
}): Promise<SafeResult<Doc[]>> {
  try {
    const resources = await model.find(filter, projection, options)
      .lean()
      .exec() as Doc[];
    return createSafeSuccessResult(resources);
  } catch (error: unknown) {
    return createSafeErrorResult(error);
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
}): Promise<SafeResult<Doc>> {
  try {
    const updateObject = {
      [updateOperator]: fields,
    } as Pick<
      QueryOptions<Doc>,
      MongooseBaseQueryOptionKeys
    >;

    const resource = await model.findByIdAndUpdate(
      resourceId,
      updateObject,
      { new: true },
    )
      .lean()
      .exec() as Doc;
    return createSafeSuccessResult(resource);
  } catch (error: unknown) {
    return createSafeErrorResult(error);
  }
}

async function deleteResourceByIdService<
  Doc extends Record<string, unknown> = RecordDB,
>(
  resourceId: string,
  model: Model<Doc>,
): Promise<SafeResult<boolean>> {
  try {
    const { acknowledged, deletedCount } = await model.deleteOne({
      _id: resourceId,
    })
      .lean()
      .exec();

    return acknowledged && deletedCount === 1
      ? createSafeSuccessResult(true)
      : new Ok(None);
  } catch (error: unknown) {
    return createSafeErrorResult(error);
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
): Promise<SafeResult<boolean>> {
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
      ? createSafeSuccessResult(true)
      : new Ok(None);
  } catch (error: unknown) {
    return createSafeErrorResult(error);
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
