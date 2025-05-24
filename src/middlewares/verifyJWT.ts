import type { NextFunction, Request, Response } from "express";

import { CONFIG } from "../config";
import { ACCESS_TOKEN_EXPIRY, PROPERTY_DESCRIPTOR } from "../constants";
import { createTokenService } from "../resources/auth/services";
import {
  createHttpResponseError,
  createSafeErrorResult,
  decodeJWTSafe,
  verifyJWTSafe,
} from "../utils";

async function verifyJWTMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const { ACCESS_TOKEN_SEED } = CONFIG;

  const [_, accessToken] = request.headers.authorization?.split(" ") || [];
  if (!accessToken) {
    response.status(200).json(
      createHttpResponseError({
        request,
        safeErrorResult: createSafeErrorResult("Access token is missing"),
        status: 401,
        triggerLogout: true,
      }),
    );

    return;
  }

  const verifiedAccessTokenResult = await verifyJWTSafe({
    seed: ACCESS_TOKEN_SEED,
    token: accessToken,
  });
  // token is invalid (except for expired)
  if (verifiedAccessTokenResult.err) {
    response.status(200).json(
      createHttpResponseError({
        request,
        safeErrorResult: verifiedAccessTokenResult,
        status: 401,
        triggerLogout: true,
      }),
    );

    return;
  }

  // token is valid and maybe expired

  const decodedAccessTokenResult = await decodeJWTSafe(accessToken);
  if (decodedAccessTokenResult.err) {
    response.status(200).json(
      createHttpResponseError({
        request,
        safeErrorResult: decodedAccessTokenResult,
        status: 401,
        triggerLogout: true,
      }),
    );

    return;
  }
  if (decodedAccessTokenResult.val.none) {
    response.status(200).json(
      createHttpResponseError({
        request,
        safeErrorResult: createSafeErrorResult("Decoded token is empty"),
        status: 401,
        triggerLogout: true,
      }),
    );

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
    response.status(200).json(
      createHttpResponseError({
        request,
        safeErrorResult: tokenCreationResult,
        status: 400,
        triggerLogout: true,
      }),
    );

    return;
  }
  if (tokenCreationResult.val.none) {
    response.status(200).json(
      createHttpResponseError({
        safeErrorResult: createSafeErrorResult("Token creation failed"),
        request,
        status: 400,
        triggerLogout: true,
      }),
    );

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
