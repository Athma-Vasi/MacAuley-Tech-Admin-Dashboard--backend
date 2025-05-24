import type { NextFunction, Request, Response } from "express";

import { CONFIG } from "../config";
import { ACCESS_TOKEN_EXPIRY, PROPERTY_DESCRIPTOR } from "../constants";
import { handleServiceErrorResult } from "../handlers";
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
    handleServiceErrorResult({
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
    handleServiceErrorResult({
      request,
      response,
      safeErrorResult: verifiedAccessTokenResult,
      triggerLogout: true,
    });
    return;
  }
  if (verifiedAccessTokenResult.val.none) {
    handleServiceErrorResult({
      request,
      response,
      safeErrorResult: createSafeErrorResult("Token is empty"),
      triggerLogout: true,
    });
    return;
  }

  // token is verified, valid and maybe expired
  // we can (safely) decode it
  const decodedAccessTokenResult = await decodeJWTSafe(accessToken);
  if (decodedAccessTokenResult.err) {
    handleServiceErrorResult({
      request,
      response,
      safeErrorResult: decodedAccessTokenResult,
      triggerLogout: true,
    });
    return;
  }
  if (decodedAccessTokenResult.val.none) {
    handleServiceErrorResult({
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
    handleServiceErrorResult({
      request,
      response,
      safeErrorResult: tokenCreationResult,
      triggerLogout: true,
    });
    return;
  }
  if (tokenCreationResult.val.none) {
    handleServiceErrorResult({
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
  // newly created access token is accessed by handlers and returned with httpServerResponse
  Object.defineProperty(request.body, "accessToken", {
    value: tokenCreationResult.val.val,
    ...PROPERTY_DESCRIPTOR,
  });

  Object.defineProperty(request.body, "userId", {
    value: decodedAccessToken.userId,
    ...PROPERTY_DESCRIPTOR,
  });

  Object.defineProperty(request.body, "roles", {
    value: decodedAccessToken.roles,
    ...PROPERTY_DESCRIPTOR,
  });

  Object.defineProperty(request.body, "username", {
    value: decodedAccessToken.username,
    ...PROPERTY_DESCRIPTOR,
  });

  Object.defineProperty(request.body, "sessionId", {
    value: decodedAccessToken.sessionId,
    ...PROPERTY_DESCRIPTOR,
  });

  next();
  return;
}

export { verifyJWTMiddleware };
