import type { Request } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { Err, Ok, type Result } from "ts-results";
import {
  createNewResourceService,
  deleteManyResourcesService,
  deleteResourceByIdService,
  getResourceByIdService,
} from "../../services";
import type { DecodedToken, ServiceOutput } from "../../types";
import { createErrorLogSchema } from "../../utils";
import { ErrorLogModel } from "../errorLog";
import { type AuthDocument, AuthModel, type AuthSchema } from "./model";

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
): Promise<Result<ServiceOutput<string>, ServiceOutput>> {
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

      return new Err({ kind: "error", message: "Error getting session" });
    }

    const existingSession = getSessionResult.safeUnwrap().data as
      | AuthDocument
      | undefined;

    if (existingSession === undefined) {
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

      return new Err({ kind: "error", message: "Session not found" });
    }

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
        kind: "error",
        message: "Error deleting previous session",
      });
    }

    // create new session
    const authSessionSchema: AuthSchema = {
      addressIP: request.ip ?? "",
      // user will be required to log in their session again after 12 hours - back up measure
      expireAt: new Date(Date.now() + 1000 * 60 * 60 * 12 * 1),
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

      return new Err({ kind: "error", message: "Error creating session" });
    }

    const newSessionId = createAuthSessionResult.safeUnwrap().data?._id;

    if (!newSessionId) {
      return new Err({ kind: "error", message: "No session ID" });
    }

    // and use its ID to sign new token
    const newAccessToken = jwt.sign(
      { userId, username, roles, sessionId: newSessionId },
      seed,
      { expiresIn },
    );

    return new Ok({ data: newAccessToken, kind: "success" });
  } catch (error: unknown) {
    await createNewResourceService(
      createErrorLogSchema(
        error,
        request.body,
      ),
      ErrorLogModel,
    );

    return new Err({ kind: "error" });
  }
}

export { createTokenService };
