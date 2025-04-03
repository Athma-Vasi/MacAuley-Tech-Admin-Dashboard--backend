import type { NextFunction, Request, Response } from "express";

function createMongoDbQueryObject(
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

  defaultQueryObject.filter = query;

  Object.defineProperty(request, "query", {
    value: defaultQueryObject,
  });
  Object.defineProperty(request, "body", {
    value: { ...request.body, newQueryFlag: false, totalDocuments: 0 },
  });

  next();
  return;
}

/**
 * TODO: fix to latest revision of createMongoDbQueryObject
     * example: here is a sample query object before transformation:
     * queryObject:  {
          createdAt: { eq: '2023-11-11' },
          reasonForLeave: { in: 'Vacation' },
          requestStatus: { in: 'pending' },
          acknowledgement: { in: 'true' },
          projection: [ '-action', '-category' ]
       }

        and here is the transformed query object:
        {
          options: { sort: { createdAt: -1, _id: -1 }, limit: 10, skip: 0 },
          projection: [ '-action', '-category', '-__v' ],
          filter: {
            createdAt: { '$eq': '2023-11-11' },
            reasonForLeave: { '$in': ['Vacation'] },
            requestStatus: { '$in': ['pending'] },
            acknowledgement: { '$in': ['true'] }
          }
        }
  */

// function createMongoDbQueryObject(
//   request: Request,
//   _response: Response,
//   next: NextFunction,
// ) {
//   const FIND_QUERY_OPTIONS_KEYWORDS = new Set([
//     "tailable",
//     "limit",
//     "skip",
//     "allowDiskUse",
//     "batchSize",
//     "readPreference",
//     "hint",
//     "comment",
//     "lean",
//     "populate",
//     "maxTimeMS",
//     "sort",
//     "strict",
//     "collation",
//     "session",
//     "explain",
//   ]);

//   console.group("createMongoDbQueryObject: BEFORE");

//   const { query } = request;

//   console.log("query: ", JSON.stringify(query, null, 2));

//   if (query === undefined) {
//     Object.defineProperty(request, "query", {
//       value: {
//         projection: "",
//         options: {
//           sort: { createdAt: -1, _id: -1 },
//           limit: 10,
//           skip: 0,
//         },
//         filter: {},
//       },
//     });
//     next();
//     return;
//   }

//   const EXCLUDED_SET = new Set([
//     "page",
//     "fields",
//     "limitPerPage",
//     "newQueryFlag",
//     "totalDocuments",
//   ]);

//   const modifiedQuery = Object.entries(query).reduce((acc, tuple) => {
//     // key may be either a logical operator, or "text" or "projection" or "sort"
//     const [key, value] = tuple as [
//       string,
//       string | ParsedQs | string[] | ParsedQs[] | undefined,
//     ];

//     if (value === undefined) {
//       return acc;
//     }

//     Object.defineProperty(acc, key, {
//       value,
//       ...PROPERTY_DESCRIPTOR,
//     });

//     return acc;
//   }, Object.create(null));

//   console.log("modifiedQuery: ", JSON.stringify(modifiedQuery, null, 2));
//   console.groupEnd();

//   const {
//     filter,
//     limit,
//     newQueryFlag,
//     options,
//     page,
//     projection,
//     totalDocuments,
//   } = Object
//     .entries(modifiedQuery).reduce(
//       (acc, tuple) => {
//         const { filter, options, projection } = acc;
//         const [key, value] = tuple as [
//           string,
//           string | ParsedQs | string[] | ParsedQs[] | undefined,
//         ];

//         if (value === undefined) {
//           return acc;
//         }

//         if (EXCLUDED_SET.has(key)) {
//           Object.defineProperty(acc, key, {
//             value,
//             ...PROPERTY_DESCRIPTOR,
//           });

//           return acc;
//         }

//         // will be part of the options object passed to the mongoose find method
//         if (FIND_QUERY_OPTIONS_KEYWORDS.has(key)) {
//           Object.defineProperty(options, key, {
//             value,
//             ...PROPERTY_DESCRIPTOR,
//           });

//           return acc;
//         }

//         if (key === "projection") {
//           if (!Array.isArray(value)) {
//             projection.push(`-${value}`);
//             return acc;
//           }

//           // biome-ignore lint/complexity/noForEach: <explanation>
//           value.forEach((field) => {
//             if (typeof field === "string" && field.length > 0) {
//               projection.push(`-${field}`);
//             }
//           });

//           return acc;
//         }

//         // part of filter object passed in same method

//         // general text search of entire collection (of fields that have a 'text' index)
//         if (key === "$text") {
//           Object.defineProperty(filter, "$text", {
//             value,
//             ...PROPERTY_DESCRIPTOR,
//           });

//           return acc;
//         }

//         const inKeyValueChangedToArrayQuery = Object.entries(value)
//           .reduce(
//             (innerAcc, [docField, queryObj]) => {
//               if (queryObj === undefined) {
//                 return innerAcc;
//               }

//               const modifiedQueryObj = Object.entries(queryObj)
//                 .reduce(
//                   (innerInnerAcc, [operator, searchTerm]) => {
//                     if (operator !== "$in") {
//                       Object.defineProperty(
//                         innerInnerAcc,
//                         operator,
//                         {
//                           value: searchTerm,
//                           ...PROPERTY_DESCRIPTOR,
//                         },
//                       );

//                       return innerInnerAcc;
//                     }

//                     // if value is string, convert to regex
//                     if (typeof searchTerm === "string") {
//                       Object.defineProperty(
//                         innerInnerAcc,
//                         operator,
//                         {
//                           value: searchTerm === "true" ||
//                               searchTerm ===
//                                 "false"
//                             ? searchTerm
//                             : new RegExp(
//                               searchTerm,
//                               "i",
//                             ),
//                           ...PROPERTY_DESCRIPTOR,
//                         },
//                       );
//                     } else if (Array.isArray(searchTerm)) {
//                       Object.defineProperty(
//                         innerInnerAcc,
//                         operator,
//                         {
//                           value: searchTerm.flatMap(
//                             (val) => {
//                               if (
//                                 val ===
//                                   undefined ||
//                                 typeof val !==
//                                   "string"
//                               ) {
//                                 return [];
//                               }

//                               const splitRegexedVal = val
//                                 .split(" ")
//                                 .map((
//                                   word: string,
//                                 ) =>
//                                   word ===
//                                       "true" ||
//                                     word ===
//                                       "false"
//                                     ? word
//                                     : new RegExp(
//                                       word,
//                                       "i",
//                                     )
//                                 );

//                               return splitRegexedVal;
//                             },
//                           ),
//                           ...PROPERTY_DESCRIPTOR,
//                         },
//                       );
//                     }

//                     return innerInnerAcc;
//                   },
//                   Object.create(null),
//                 );

//               Object.defineProperty(innerAcc, docField, {
//                 value: modifiedQueryObj,
//                 ...PROPERTY_DESCRIPTOR,
//               });

//               return innerAcc;
//             },
//             Object.create(null),
//           );

//         // ex: { field: { $eq: searchTerm } }
//         const logicalOperatorValue = filter[key] ??
//           [inKeyValueChangedToArrayQuery];

//         Object.defineProperty(filter, key, {
//           value: logicalOperatorValue,
//           ...PROPERTY_DESCRIPTOR,
//         });

//         return acc;
//       },
//       {
//         filter: Object.create(null),
//         limit: 10,
//         newQueryFlag: false,
//         options: Object.create(null),
//         page: 1,
//         projection: [] as string[],
//         totalDocuments: 0,
//       },
//     );

//   // set default createdAt sort field if it does not exist: { createdAt: -1, _id: -1 }
//   // as all schemas have timestamps enabled, createdAt field is guaranteed to exist
//   if (!Object.hasOwn(options, "sort")) {
//     Object.defineProperty(options, "sort", {
//       value: { createdAt: -1 },
//       ...PROPERTY_DESCRIPTOR,
//     });
//   }
//   // if there is only one sort field, _id field with corresponding sort direction is added for consistent results
//   // as _id is unique, orderable and immutable
//   // ex: { createdAt: -1, _id: -1 }
//   const { sort } = options;
//   if (Object.keys(sort).length === 1) {
//     const sortDirection = Number(Object.values(sort)[0]) < 0 ? -1 : 1;
//     Object.defineProperty(sort, "_id", {
//       value: sortDirection,
//       ...PROPERTY_DESCRIPTOR,
//     });
//   }

//   // set pagination default values for limit and skip
//   Object.defineProperty(options, "limit", {
//     value: limit,
//     ...PROPERTY_DESCRIPTOR,
//   });

//   const skip = (page - 1) * limit; // offset
//   Object.defineProperty(options, "skip", {
//     value: skip,
//     ...PROPERTY_DESCRIPTOR,
//   });

//   Object.defineProperty(request, "query", {
//     value: { projection, options, filter },
//     ...PROPERTY_DESCRIPTOR,
//   });
//   Object.defineProperty(request, "body", {
//     value: { ...request.body, newQueryFlag, totalDocuments },
//     ...PROPERTY_DESCRIPTOR,
//   });

//   console.group("createMongoDbQueryObject: AFTER");
//   console.log("REQUEST BODY", JSON.stringify(request.body, null, 2));
//   console.log("query.newQueryFlag: ", newQueryFlag);
//   console.log("query.totalDocuments: ", totalDocuments);
//   console.log("options: ", JSON.stringify(options, null, 2));
//   console.log("projection: ", JSON.stringify(projection, null, 2));
//   console.log("filter: ", JSON.stringify(filter, null, 2));
//   console.log("stringified filter: ", JSON.stringify(filter, null, 2));
//   console.groupEnd();

//   next();
//   return;
// }

export { createMongoDbQueryObject };
