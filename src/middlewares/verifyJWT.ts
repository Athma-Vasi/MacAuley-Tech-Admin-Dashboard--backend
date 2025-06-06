import type { NextFunction, Request, Response } from "express";

import { CONFIG } from "../config";
import { ACCESS_TOKEN_EXPIRY, PROPERTY_DESCRIPTOR } from "../constants";
import { handleErrorResult } from "../handlers";
import { createTokenService } from "../resources/auth/services";
import { createSafeErrorResult, decodeJWTSafe, verifyJWTSafe } from "../utils";

async function verifyJWTMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const { ACCESS_TOKEN_SEED } = CONFIG;

  const [_, accessToken] = request.headers.authorization?.split(" ") ?? [];
  if (!accessToken) {
    handleErrorResult({
      request,
      response,
      safeErrorResult: createSafeErrorResult(
        "Access token is missing",
      ),
      triggerLogout: true,
    });
    return;
  }

  const verifiedAccessTokenResult = await verifyJWTSafe({
    seed: ACCESS_TOKEN_SEED,
    token: accessToken,
  });

  // token is invalid (except for expired)

  if (verifiedAccessTokenResult.err) {
    handleErrorResult({
      request,
      response,
      safeErrorResult: verifiedAccessTokenResult,
      triggerLogout: true,
    });
    return;
  }

  // token is verified, valid and maybe expired
  // can now (safely) decode it
  const decodedAccessTokenResult = await decodeJWTSafe(accessToken);
  if (decodedAccessTokenResult.err) {
    handleErrorResult({
      request,
      response,
      safeErrorResult: decodedAccessTokenResult,
      triggerLogout: true,
    });
    return;
  }
  if (decodedAccessTokenResult.val.none) {
    handleErrorResult({
      request,
      response,
      safeErrorResult: createSafeErrorResult("Token is empty"),
      triggerLogout: true,
    });
    return;
  }

  // always create new token
  const tokenCreationResult = await createTokenService({
    accessToken,
    decodedOldToken: decodedAccessTokenResult.val.val,
    expiresIn: ACCESS_TOKEN_EXPIRY, // 5 seconds
    request,
    seed: ACCESS_TOKEN_SEED,
  });
  if (tokenCreationResult.err) {
    handleErrorResult({
      request,
      response,
      safeErrorResult: tokenCreationResult,
      triggerLogout: true,
    });
    return;
  }
  if (tokenCreationResult.val.none) {
    handleErrorResult({
      request,
      response,
      safeErrorResult: createSafeErrorResult(
        "Token creation failed",
      ),
      triggerLogout: true,
    });
    return;
  }

  const decodedAccessToken = decodedAccessTokenResult.val.val;

  Object.defineProperties(request.body, {
    // accessToken is used by handlers to access the token and returned with httpServerResponse
    accessToken: {
      value: tokenCreationResult.val.val,
      ...PROPERTY_DESCRIPTOR,
    },
    userId: {
      value: decodedAccessToken.userId,
      ...PROPERTY_DESCRIPTOR,
    },
    roles: {
      value: decodedAccessToken.roles,
      ...PROPERTY_DESCRIPTOR,
    },
    username: {
      value: decodedAccessToken.username,
      ...PROPERTY_DESCRIPTOR,
    },
    sessionId: {
      value: decodedAccessToken.sessionId,
      ...PROPERTY_DESCRIPTOR,
    },
  });

  next();
  return;
}

export { verifyJWTMiddleware };
