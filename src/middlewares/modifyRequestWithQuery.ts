import type { NextFunction, Request, Response } from "express";
import { PROPERTY_DESCRIPTOR } from "../constants";

/**
 *
     * example: here is a sample express query object before transformation:
     * queryObject:  {
         "$and": {
           "username": {
             "$in": "qwe"
           }
         },
         "$nor": {
           "username": {
             "$in": "asd"
           }
         },
         "$or": {
           "username": {
             "$in": "zxc"
           }
         },
         "sort": {
           "updatedAt": "-1"
         },
         "projection": "department",
         "limit": "10",
         "totalDocuments": "0",
         "newQueryFlag": "true"
       }


        and here is the transformed query object:
        {
          "projection": [
            "-department"
          ],
          "options": {
            "sort": {
              "createdAt": -1,
              "_id": -1,
              "updatedAt": "-1"
            },
            "limit": 10,
            "skip": 0
          },
          "filter": {
            "$and": [
              {
                "username": {
                  "$in": "qwe"
                }
              }
            ],
            "$nor": [
              {
                "username": {
                  "$in": "asd"
                }
              }
            ],
            "$or": [
              {
                "username": {
                  "$in": "zxc"
                }
              }
            ]
          }
        }
  */

function modifyRequestWithQuery(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  const defaultQueryObject = {
    projection: "",
    options: {
      sort: { createdAt: -1, _id: -1 },
      limit: 10,
      skip: 0,
    },
    filter: {},
  };

  const { query } = request;

  if (query === undefined) {
    Object.defineProperty(request, "query", {
      value: defaultQueryObject,
    });
    next();
    return;
  }

  // keywords that are attached to request body
  const EXCLUDED_SET = new Set([
    "page",
    "fields",
    "limitPerPage",
    "newQueryFlag",
    "totalDocuments",
  ]);

  // keywords that are attached to request.query.options passed to mongoose find method
  const FIND_QUERY_OPTIONS_KEYWORDS = new Set([
    "tailable",
    // "limit",
    "skip",
    "allowDiskUse",
    "batchSize",
    "readPreference",
    "hint",
    "comment",
    "lean",
    "populate",
    "maxTimeMS",
    "strict",
    "collation",
    "session",
    "explain",
  ]);

  const LOGICAL_OPERATORS = new Set([
    "$and",
    "$or",
    "$nor",
    "$not",
    "$elemMatch",
    "$where",
  ]);

  const initialAcc = {
    filter: Object.create(null),
    limit: 10,
    newQueryFlag: false,
    options: Object.create(null),
    page: 1,
    projection: [] as string[],
    totalDocuments: 0,
  };

  const {
    filter,
    limit,
    newQueryFlag,
    options,
    page,
    projection,
    totalDocuments,
  } = Object.entries(query).reduce(
    (acc, [key, value]) => {
      const { filter, options, projection } = acc;

      if (value === undefined) {
        return acc;
      }

      // limit is passed into options for pagination
      // and is also passed into request body
      if (key === "limit") {
        Object.defineProperty(options, key, {
          value,
          ...PROPERTY_DESCRIPTOR,
        });

        Object.defineProperty(acc, key, {
          value,
          ...PROPERTY_DESCRIPTOR,
        });

        return acc;
      }

      // these go into the options object passed to mongoose find method
      if (FIND_QUERY_OPTIONS_KEYWORDS.has(key)) {
        Object.defineProperty(options, key, {
          value,
          ...PROPERTY_DESCRIPTOR,
        });

        return acc;
      }

      // these are passed into the request body object
      if (EXCLUDED_SET.has(key)) {
        Object.defineProperty(acc, key, {
          value,
          ...PROPERTY_DESCRIPTOR,
        });

        return acc;
      }

      if (LOGICAL_OPERATORS.has(key)) {
        const existingArray = filter[key] ?? [];
        existingArray.push(value);
        Object.defineProperty(filter, key, {
          value: existingArray,
          ...PROPERTY_DESCRIPTOR,
        });
        return acc;
      }

      // part of filter object passed in same method

      // general text search of entire collection (of fields that have a 'text' index)
      if (key === "$text") {
        Object.defineProperty(filter, "$text", {
          value,
          ...PROPERTY_DESCRIPTOR,
        });

        return acc;
      }

      // fields that are to be excluded are passed in as an array of strings
      if (key === "projection") {
        value?.toString().split(",").forEach((field) => {
          if (typeof field === "string" && field.length > 0) {
            projection.push(`-${field}`);
          }
        });
        return acc;
      }

      // sort is passed inside the options object passed to mongoose find method
      if (key === "sort") {
        const initialAcc = Object.keys(value).length === 0
          ? {
            createdAt: -1,
            _id: -1,
          }
          : { _id: -1 };
        const newSort = Object.entries(value).reduce((sortAcc, curr) => {
          const [field, sortDirection] = curr as [string, string];
          Object.defineProperty(sortAcc, field, {
            value: Number.parseInt(sortDirection),
            ...PROPERTY_DESCRIPTOR,
          });

          return sortAcc;
        }, initialAcc);

        Object.defineProperty(options, "sort", {
          value: newSort,
          ...PROPERTY_DESCRIPTOR,
        });
        return acc;
      }

      // rest are assumed to be logical operators and are added to the filter object
      Object.defineProperty(
        filter,
        key,
        {
          value,
          ...PROPERTY_DESCRIPTOR,
        },
      );

      return acc;
    },
    initialAcc,
  );

  const skip = (page - 1) * limit; // offset
  Object.defineProperty(options, "skip", {
    value: skip,
    ...PROPERTY_DESCRIPTOR,
  });

  Object.defineProperty(options, "limit", {
    value: limit,
    ...PROPERTY_DESCRIPTOR,
  });

  Object.defineProperty(request, "query", {
    value: { projection, options, filter },
    ...PROPERTY_DESCRIPTOR,
  });
  Object.defineProperty(request, "body", {
    value: { ...request.body, newQueryFlag, totalDocuments },
    ...PROPERTY_DESCRIPTOR,
  });

  console.group("modifyRequestWithQuery");
  console.log({ query });
  console.groupEnd();

  next();
  return;
}

export { modifyRequestWithQuery };
