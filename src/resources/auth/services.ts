import type { Request } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { Err, Ok } from "ts-results";
import {
  createNewResourceService,
  deleteManyResourcesService,
  deleteResourceByIdService,
  getResourceByIdService,
} from "../../services";
import type { DecodedToken, ServiceResult } from "../../types";
import { createErrorLogSchema } from "../../utils";
import { ErrorLogModel } from "../errorLog";
import { AuthModel, type AuthSchema } from "./model";

// this is a service that creates a new token for the user
// it is used when the user wants to refresh their token
// it takes the decoded old token and creates a new token with the same payload
// but with a new session ID
// it also deletes the old session from the database
// and creates a new session with the new session ID
async function createTokenService(
  {
    decodedOldToken,
    expiresIn,
    request,
    seed,
  }: {
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
      console.log("get session result is error");

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

      return new Err({ message: "Error getting session" });
    }

    const existingSessionUnwrapped = getSessionResult.safeUnwrap().data;

    if (existingSessionUnwrapped.length === 0) {
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

      return new Err({ message: "Session not found" });
    }

    const [existingSession] = existingSessionUnwrapped;

    console.log("createTokenService");
    console.log("existing session", existingSession);

    // delete old session from database

    const deleteSessionResult = await deleteResourceByIdService(
      existingSession._id.toString(),
      AuthModel,
    );

    if (deleteSessionResult.err) {
      await createNewResourceService(
        createErrorLogSchema(
          deleteSessionResult.val,
          request.body,
        ),
        ErrorLogModel,
      );

      return new Err({
        message: "Error deleting previous session",
      });
    }

    // create new session
    const authSessionSchema: AuthSchema = {
      addressIP: request.ip ?? "",
      // user will be required to log in their session again after 1 hour - back up measure
      expireAt: new Date(Date.now() + 1000 * 60 * 60 * 1 * 1),
      userAgent: request.get("User-Agent") ?? "",
      userId,
      username,
    };

    const createAuthSessionResult = await createNewResourceService(
      authSessionSchema,
      AuthModel,
    );

    if (createAuthSessionResult.err) {
      await createNewResourceService(
        createErrorLogSchema(createAuthSessionResult.val, request.body),
        ErrorLogModel,
      );

      return new Err({ message: "Error creating session" });
    }

    const createAuthSessionUnwrapped =
      createAuthSessionResult.safeUnwrap().data;

    if (createAuthSessionUnwrapped.length === 0) {
      await createNewResourceService(
        createErrorLogSchema(createAuthSessionResult.val, request.body),
        ErrorLogModel,
      );

      return new Err({ message: "Error creating session" });
    }

    const [newAuthSession] = createAuthSessionUnwrapped;

    // and use its ID to sign new token
    const newAccessToken = jwt.sign(
      { userId, username, roles, sessionId: newAuthSession._id },
      seed,
      { expiresIn },
    );

    return new Ok({ data: [newAccessToken], kind: "success" });
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
