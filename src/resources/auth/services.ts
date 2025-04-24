import type { Request } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { Err, Ok } from "ts-results";
import {
  createNewResourceService,
  deleteManyResourcesService,
  getResourceByIdService,
  updateResourceByIdService,
} from "../../services";
import type { DecodedToken, ServiceResult } from "../../types";
import { createErrorLogSchema } from "../../utils";
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
): ServiceResult<string> {
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

    if (getSessionResult.err) {
      // invalidate all sessions for this user
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

        return new Err({ message: "Error deleting session" });
      }

      return new Err({ message: "Unable to retrieve session" });
    }

    const existingSessionUnwrapped = getSessionResult.safeUnwrap();

    // session not found, means session document auto expired
    if (existingSessionUnwrapped.kind === "notFound") {
      // user needs to log in again
      return new Ok({ data: [], kind: "notFound" });
    }

    const [existingSession] = existingSessionUnwrapped.data;

    if (existingSession === null || existingSession === undefined) {
      return new Err({ message: "Error getting session" });
    }

    // session was found,

    // if the incoming access token is not the same as the one in the database
    if (existingSession.currentlyActiveToken !== accessToken) {
      // invalidate all sessions for this user
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
      }
      return new Err({ message: "Access token cannot be matched" });
    }

    // create a new access token
    // and use existing session ID to sign new token
    const newAccessToken = jwt.sign(
      { userId, username, roles, sessionId: existingSession._id.toString() },
      seed,
      { expiresIn },
    );

    // update the session in the database with the new access token
    const updateSessionResult = await updateResourceByIdService(
      {
        fields: {
          currentlyActiveToken: newAccessToken,
          addressIP: request.ip ?? "unknown",
          userAgent: request.headers["user-agent"] ?? "unknown",
        },
        model: AuthModel,
        resourceId: existingSession._id.toString(),
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

      return new Err({ message: "Error updating session" });
    }

    // update session was successful
    // return the new access token
    const [updatedSession] = updateSessionResult.safeUnwrap().data;
    if (updatedSession === null || updatedSession === undefined) {
      return new Err({ message: "Error updating session" });
    }

    return new Ok({
      data: [newAccessToken],
      kind: "success",
    });
  } catch (error: unknown) {
    await createNewResourceService(
      createErrorLogSchema(
        error,
        request.body,
      ),
      ErrorLogModel,
    );

    return new Err({ message: "Error creating token" });
  }
}

export { createTokenService };
