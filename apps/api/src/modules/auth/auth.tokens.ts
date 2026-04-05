import { UnauthorizedException } from "@nestjs/common";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { get_env } from "../../config/env";
import { bootstrap_role_codes, type AuthRoleCode } from "./auth.contract";

interface BaseTokenPayload {
  sub: string;
  sid: string;
  role: AuthRoleCode;
  jti: string;
  iat: number;
  exp: number;
}

export interface AccessTokenPayload extends BaseTokenPayload {
  typ: "access";
}

export interface RefreshTokenPayload extends BaseTokenPayload {
  typ: "refresh";
}

type SupportedTokenPayload = AccessTokenPayload | RefreshTokenPayload;

const roleCodeSet = new Set<AuthRoleCode>(bootstrap_role_codes);

function sign_encoded_payload(encodedPayload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(encodedPayload).digest();
}

function sign_token(payload: SupportedTokenPayload, secret: string): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign_encoded_payload(encodedPayload, secret).toString("base64url");
  return `${encodedPayload}.${signature}`;
}

function parse_supported_token_payload(record: Record<string, unknown>): SupportedTokenPayload | null {
  const typ = record.typ;
  if (typ !== "access" && typ !== "refresh") {
    return null;
  }

  const sub = typeof record.sub === "string" ? record.sub : "";
  const sid = typeof record.sid === "string" ? record.sid : "";
  const role = typeof record.role === "string" ? record.role : "";
  const jti = typeof record.jti === "string" ? record.jti : "";
  const iat = typeof record.iat === "number" ? record.iat : 0;
  const exp = typeof record.exp === "number" ? record.exp : 0;

  if (sub.length === 0 || sid.length === 0 || jti.length === 0) {
    return null;
  }

  if (!Number.isFinite(iat) || !Number.isFinite(exp)) {
    return null;
  }

  if (!roleCodeSet.has(role as AuthRoleCode)) {
    return null;
  }

  const payload = {
    typ,
    sub,
    sid,
    role: role as AuthRoleCode,
    jti,
    iat,
    exp
  };

  return typ === "access"
    ? (payload as AccessTokenPayload)
    : (payload as RefreshTokenPayload);
}

function decode_and_verify(token: string, secret: string): SupportedTokenPayload {
  const [encodedPayload, encodedSignature] = token.split(".");
  if (!encodedPayload || !encodedSignature) {
    throw new UnauthorizedException({
      code: "ACCESS_DENIED",
      message: "Token format is invalid"
    });
  }

  const expectedSignature = sign_encoded_payload(encodedPayload, secret);
  const actualSignature = Buffer.from(encodedSignature, "base64url");
  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    throw new UnauthorizedException({
      code: "ACCESS_DENIED",
      message: "Token signature is invalid"
    });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    throw new UnauthorizedException({
      code: "ACCESS_DENIED",
      message: "Token payload is invalid"
    });
  }

  if (!payload || typeof payload !== "object") {
    throw new UnauthorizedException({
      code: "ACCESS_DENIED",
      message: "Token payload is invalid"
    });
  }

  const parsedPayload = parse_supported_token_payload(payload as Record<string, unknown>);
  if (!parsedPayload) {
    throw new UnauthorizedException({
      code: "ACCESS_DENIED",
      message: "Token payload is invalid"
    });
  }

  if (parsedPayload.exp <= Math.floor(Date.now() / 1000)) {
    throw new UnauthorizedException({
      code: "ACCESS_DENIED",
      message: "Token is expired"
    });
  }

  return parsedPayload;
}

function build_payload(
  type: "access" | "refresh",
  userId: string,
  sessionId: string,
  roleCode: AuthRoleCode,
  ttlSeconds: number
): SupportedTokenPayload {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    typ: type,
    sub: userId,
    sid: sessionId,
    role: roleCode,
    jti: randomUUID(),
    iat: now,
    exp: now + ttlSeconds
  };

  return type === "access"
    ? (payload as AccessTokenPayload)
    : (payload as RefreshTokenPayload);
}

export function issue_access_token(
  userId: string,
  sessionId: string,
  roleCode: AuthRoleCode
): { token: string; payload: AccessTokenPayload } {
  const env = get_env();
  const payload = build_payload(
    "access",
    userId,
    sessionId,
    roleCode,
    env.AUTH_ACCESS_TOKEN_TTL_MINUTES * 60
  ) as AccessTokenPayload;
  return {
    token: sign_token(payload, env.ACCESS_TOKEN_SECRET),
    payload
  };
}

export function issue_refresh_token(
  userId: string,
  sessionId: string,
  roleCode: AuthRoleCode
): { token: string; payload: RefreshTokenPayload } {
  const env = get_env();
  const payload = build_payload(
    "refresh",
    userId,
    sessionId,
    roleCode,
    env.AUTH_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60
  ) as RefreshTokenPayload;
  return {
    token: sign_token(payload, env.REFRESH_TOKEN_SECRET),
    payload
  };
}

export function verify_access_token(token: string): AccessTokenPayload {
  const env = get_env();
  const payload = decode_and_verify(token, env.ACCESS_TOKEN_SECRET);
  if (payload.typ !== "access") {
    throw new UnauthorizedException({
      code: "ACCESS_DENIED",
      message: "Access token type is invalid"
    });
  }

  return payload;
}

export function verify_refresh_token(token: string): RefreshTokenPayload {
  const env = get_env();
  const payload = decode_and_verify(token, env.REFRESH_TOKEN_SECRET);
  if (payload.typ !== "refresh") {
    throw new UnauthorizedException({
      code: "ACCESS_DENIED",
      message: "Refresh token type is invalid"
    });
  }

  return payload;
}
