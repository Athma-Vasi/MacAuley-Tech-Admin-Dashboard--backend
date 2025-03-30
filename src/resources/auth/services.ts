import { Request } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import { Err, Ok, Result } from "ts-results";
import {
  createNewResourceService,
  deleteManyResourcesService,
  getResourceByIdService,
  updateResourceByIdService,
} from "../../services";
import { DecodedToken, ServiceOutput } from "../../types";
import { createErrorLogSchema } from "../../utils";
import { ErrorLogModel } from "../errorLog";
import { AuthDocument, AuthModel, AuthSchema } from "./model";

async function createTokenService(
  {
    decodedOldToken,
    expiresIn,
    invalidateOldToken = false,
    request,
    seed,
  }: {
    decodedOldToken: DecodedToken;
    expiresIn: SignOptions["expiresIn"];
    invalidateOldToken?: boolean;
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
      await createNewResourceService(
        createErrorLogSchema(
          getSessionResult.val,
          request.body,
        ),
        ErrorLogModel,
      );

      return new Err({ kind: "error", message: "Error getting session" });
    }

    const existingSession = getSessionResult.safeUnwrap().data as
      | AuthDocument
      | undefined;

    if (existingSession === undefined) {
      return new Err({ kind: "error", message: "Session not found" });
    }

    if (!existingSession.isValid) {
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

      return new Err({ kind: "error", message: "Session invalid" });
    }

    // if token is being refreshed, revoke validity of existing session
    if (invalidateOldToken) {
      const updateSessionResult = await updateResourceByIdService({
        resourceId: sessionId.toString(),
        fields: { isValid: false },
        model: AuthModel,
        updateOperator: "$set",
      });

      if (updateSessionResult.err) {
        await createNewResourceService(
          createErrorLogSchema(
            updateSessionResult.val,
            request.body,
          ),
          ErrorLogModel,
        );

        return new Err({ kind: "error", message: "Error updating session" });
      }
    }

    // create new session and use its ID to sign new token
    const authSessionSchema: AuthSchema = {
      addressIP: request.ip ?? "",
      // user will be required to log in their session again after 1 day
      expireAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1),
      isValid: true,
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
