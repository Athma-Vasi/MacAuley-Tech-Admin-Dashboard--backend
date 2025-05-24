import type { Request } from "express";
import type { SignOptions } from "jsonwebtoken";
import {
  createNewResourceService,
  deleteResourceByIdService,
  getResourceByIdService,
  updateResourceByIdService,
} from "../../services";
import type { DecodedToken, SafeResult } from "../../types";
import {
  createErrorLogSchema,
  createSafeErrorResult,
  createSafeSuccessResult,
  signJWTSafe,
} from "../../utils";
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
): Promise<SafeResult<string>> {
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
    if (getSessionResult.err) {
      return getSessionResult;
    }

    // session has maybe expired ( > 24 hours)
    // user will be required to log in again
    if (getSessionResult.val.none) {
      return createSafeErrorResult(
        "Session not found",
      );
    }

    // auth session document found
    const authSessionDocument = getSessionResult.val.val;

    // if the incoming access token is not the same as the one in the database
    if (
      authSessionDocument.currentlyActiveToken.trim() !== accessToken.trim()
    ) {
      // invalidate currently active session
      const deleteSessionResult = await deleteResourceByIdService(
        sessionId.toString(),
        AuthModel,
      );
      if (deleteSessionResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            deleteSessionResult,
            request.body,
          ),
          ErrorLogModel,
        );

        return deleteSessionResult;
      }

      if (deleteSessionResult.val.none) {
        return createSafeErrorResult(
          "Unable to delete session",
        );
      }
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
          newAccessTokenResult,
          request.body,
        ),
        ErrorLogModel,
      );

      return newAccessTokenResult;
    }
    if (newAccessTokenResult.val.none) {
      return createSafeErrorResult(
        "Unable to create access token",
      );
    }

    // update the session in the database with the new access token
    const updateSessionResult = await updateResourceByIdService(
      {
        fields: {
          currentlyActiveToken: newAccessTokenResult.val.val,
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
          updateSessionResult,
          request.body,
        ),
        ErrorLogModel,
      );

      return updateSessionResult;
    }

    if (updateSessionResult.val.none) {
      return createSafeErrorResult(
        "Unable to update session",
      );
    }

    // update session was successful
    // return the new access token
    return createSafeSuccessResult(
      newAccessTokenResult.val.val,
    );
  } catch (error: unknown) {
    return createSafeErrorResult(error);
  }
}

export { createTokenService };
