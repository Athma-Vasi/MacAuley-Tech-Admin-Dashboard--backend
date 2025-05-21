import type { Request } from "express";
import type { SignOptions } from "jsonwebtoken";
import { Err, None, Ok, Some } from "ts-results";
import {
  createNewResourceService,
  deleteManyResourcesService,
  getResourceByIdService,
  updateResourceByIdService,
} from "../../services";
import type { DecodedToken, SafeBoxResult } from "../../types";
import { createErrorLogSchema, signJWTSafe } from "../../utils";
import { ErrorLogModel } from "../errorLog";
import { AuthModel } from "./model";

// this is a service that creates a new token for the user
// it is used when the user wants to refresh their token
// it takes the decoded old token and creates a new token with the same payload
// and with existing session ID
// and updates its currentlyActiveToken field with newly created access token
async function createTokenService(
  { accessToken, decodedOldToken, expiresIn, request, seed }: {
    accessToken: string;
    decodedOldToken: DecodedToken;
    expiresIn: SignOptions["expiresIn"];
    request: Request;
    seed: string;
  },
): Promise<SafeBoxResult<string, unknown>> {
  try {
    const {
      userId,
      roles,
      username,
      sessionId,
    } = decodedOldToken;

    const getSessionResult = await getResourceByIdService(
      sessionId.toString(),
      AuthModel,
    );

    // if unable to get auth session document
    if (getSessionResult.err || getSessionResult.val.data.none) {
      // delete all currently active sessions for this user
      const deleteManyResult = await deleteManyResourcesService({
        filter: { userId },
        model: AuthModel,
      });

      if (deleteManyResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            deleteManyResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        return deleteManyResult;
      }

      return deleteManyResult.val.data.none
        ? new Err({
          data: None,
          message: deleteManyResult.val.message ??
            Some("Some sessions not found"),
        })
        : new Err({
          data: None,
          message: Some("Deleted all sessions"),
        });
    }

    // auth session document found
    const authSessionDocument = getSessionResult.val.data.val;

    // if the incoming access token is not the same as the one in the database
    if (authSessionDocument.currentlyActiveToken !== accessToken) {
      // delete all currently active sessions for this user
      const deleteManyResult = await deleteManyResourcesService({
        filter: { userId },
        model: AuthModel,
      });
      if (deleteManyResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            deleteManyResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        return deleteManyResult;
      }

      return deleteManyResult.val.data.none
        ? new Err({
          data: None,
          message: deleteManyResult.val.message ??
            Some("Some sessions not found"),
        })
        : new Err({
          data: None,
          message: Some("Deleted all sessions"),
        });
    }

    // create a new access token
    // and use existing session ID to sign new token
    const newAccessTokenResult = signJWTSafe({
      payload: {
        userId,
        username,
        roles,
        sessionId: authSessionDocument._id.toString(),
      },
      secretOrPrivateKey: seed,
      options: {
        expiresIn,
      },
    });

    if (newAccessTokenResult.err) {
      await createNewResourceService(
        createErrorLogSchema(
          newAccessTokenResult.val,
          request.body,
        ),
        ErrorLogModel,
      );

      return newAccessTokenResult;
    }

    // update the session in the database with the new access token
    const updateSessionResult = await updateResourceByIdService(
      {
        fields: {
          currentlyActiveToken: newAccessTokenResult.val.data.val,
          addressIP: request.ip ?? "unknown",
          userAgent: request.headers["user-agent"] ?? "unknown",
        },
        model: AuthModel,
        resourceId: authSessionDocument._id.toString(),
        updateOperator: "$set",
      },
    );

    if (updateSessionResult.err) {
      await createNewResourceService(
        createErrorLogSchema(
          updateSessionResult.val,
          request.body,
        ),
        ErrorLogModel,
      );

      return updateSessionResult;
    }

    if (updateSessionResult.val.data.none) {
      return new Err({
        data: None,
        message: updateSessionResult.val.message ??
          Some("Unable to update session"),
      });
    }

    // update session was successful
    // return the new access token
    return new Ok({
      data: newAccessTokenResult.val.data,
      message: Some("Token created successfully"),
    });
  } catch (error: unknown) {
    const message = Some("Error creating token");

    await createNewResourceService(
      createErrorLogSchema(
        { data: Some(error), message },
        request.body,
      ),
      ErrorLogModel,
    );

    return new Err({ data: Some(error), message });
  }
}

export { createTokenService };
