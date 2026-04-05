import { get_env } from "../../config/env";
import type { IssuedTokenPair } from "./auth.contract";

interface CookieWriteOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge: number;
  domain?: string;
}

export interface CookieRequestLike {
  headers: Record<string, string | string[] | undefined>;
}

export interface CookieResponseLike {
  cookie(name: string, value: string, options: CookieWriteOptions): unknown;
  clearCookie(name: string, options: CookieWriteOptions): unknown;
}

function split_cookie_pair(cookiePair: string): [string, string] | null {
  const separatorIndex = cookiePair.indexOf("=");
  if (separatorIndex <= 0) {
    return null;
  }

  const name = cookiePair.slice(0, separatorIndex).trim();
  const value = cookiePair.slice(separatorIndex + 1).trim();
  if (name.length === 0 || value.length === 0) {
    return null;
  }

  return [name, value];
}

function build_cookie_options(maxAgeMs: number): CookieWriteOptions {
  const env = get_env();
  const options: CookieWriteOptions = {
    httpOnly: true,
    secure: env.AUTH_COOKIE_SECURE,
    sameSite: env.AUTH_COOKIE_SAME_SITE,
    path: "/",
    maxAge: maxAgeMs
  };

  if (env.AUTH_COOKIE_DOMAIN.length > 0) {
    options.domain = env.AUTH_COOKIE_DOMAIN;
  }

  return options;
}

export function read_cookie(request: CookieRequestLike, cookieName: string): string | undefined {
  const rawCookieHeader = request.headers.cookie;
  const cookieHeader =
    typeof rawCookieHeader === "string" ? rawCookieHeader : rawCookieHeader?.join("; ");
  if (!cookieHeader || cookieHeader.length === 0) {
    return undefined;
  }

  const cookiePairs = cookieHeader.split(";");
  for (const pair of cookiePairs) {
    const parsed = split_cookie_pair(pair);
    if (!parsed) {
      continue;
    }

    const [name, value] = parsed;
    if (name === cookieName) {
      return decodeURIComponent(value);
    }
  }

  return undefined;
}

export function set_auth_cookies(response: CookieResponseLike, tokens: IssuedTokenPair): void {
  const env = get_env();
  response.cookie(
    env.AUTH_COOKIE_ACCESS_NAME,
    tokens.accessToken,
    build_cookie_options(env.AUTH_ACCESS_TOKEN_TTL_MINUTES * 60_000)
  );
  response.cookie(
    env.AUTH_COOKIE_REFRESH_NAME,
    tokens.refreshToken,
    build_cookie_options(env.AUTH_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60_000)
  );
}

export function clear_auth_cookies(response: CookieResponseLike): void {
  const env = get_env();
  const resetOptions = build_cookie_options(0);

  response.clearCookie(env.AUTH_COOKIE_ACCESS_NAME, resetOptions);
  response.clearCookie(env.AUTH_COOKIE_REFRESH_NAME, resetOptions);
}
