import type { NextFunction, Request, Response } from "express";

import { CONFIG } from "../config";
import { ACCESS_TOKEN_EXPIRY, PROPERTY_DESCRIPTOR } from "../constants";
import { createTokenService } from "../resources/auth/services";
import { createHttpResultError, decodeJWTSafe, verifyJWTSafe } from "../utils";

async function verifyJWTMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const { ACCESS_TOKEN_SEED } = CONFIG;

  const [_, accessToken] = request.headers.authorization?.split(" ") || [];
  if (!accessToken) {
    response.status(200).json(
      createHttpResultError({
        message: "Access token not found",
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
      createHttpResultError({
        message: "Access token invalid",
        triggerLogout: true,
      }),
    );

    return;
  }

  // token is valid and maybe expired

  // token is valid and not expired
  // reuse same token
  // if (verifiedAccessTokenUnwrapped.kind === "success") {
  //   Object.defineProperty(request.body, "accessToken", {
  //     value: accessToken,
  //     ...PROPERTY_DESCRIPTOR,
  //   });
  // }

  // token is valid and expired
  // always create new token, delete old token

  const decodedAccessTokenResult = await decodeJWTSafe(accessToken);

  if (decodedAccessTokenResult.err) {
    response.status(200).json(
      createHttpResultError({
        message: "Error decoding access token",
        triggerLogout: true,
      }),
    );

    return;
  }

  const decodedAccessToken = decodedAccessTokenResult.safeUnwrap().data[0];
  if (!decodedAccessToken) {
    response.status(200).json(
      createHttpResultError({
        message: "Error decoding access token",
        triggerLogout: true,
      }),
    );
    return;
  }

  const tokenCreationResult = await createTokenService({
    decodedOldToken: decodedAccessToken,
    expiresIn: ACCESS_TOKEN_EXPIRY,
    request,
    seed: ACCESS_TOKEN_SEED,
  });

  if (tokenCreationResult.err) {
    response.status(200).json(
      createHttpResultError({
        message: "Error creating access token",
        triggerLogout: true,
      }),
    );

    return;
  }

  const tokenCreationResultUnwrapped = tokenCreationResult.safeUnwrap().data;

  if (tokenCreationResultUnwrapped.length === 0) {
    response.status(200).json(
      createHttpResultError({
        message: "Error creating access token",
        triggerLogout: true,
      }),
    );

    return;
  }

  console.log("tokenCreationResultUnwrapped", tokenCreationResultUnwrapped);

  const [newAccessToken] = tokenCreationResultUnwrapped;

  Object.defineProperty(request.body, "accessToken", {
    value: newAccessToken,
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
