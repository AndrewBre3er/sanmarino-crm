import type { Env } from "./env.schema";

let cache: Env | null = null;

function parse_number(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parse_boolean(value: string | undefined, fallback: boolean): boolean {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }

  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }

  return fallback;
}

function parse_same_site(value: string | undefined): Env["AUTH_COOKIE_SAME_SITE"] {
  if (value === "strict" || value === "none") {
    return value;
  }

  return "lax";
}

export function get_env(): Env {
  if (cache) {
    return cache;
  }

  cache = {
    NODE_ENV: process.env.NODE_ENV ?? "development",
    API_HOST: process.env.API_HOST ?? "0.0.0.0",
    API_PORT: parse_number(process.env.API_PORT, 4000),
    API_CORS_ORIGIN: process.env.API_CORS_ORIGIN ?? "http://localhost:3000",
    DATABASE_URL: process.env.DATABASE_URL ?? "",
    REDIS_URL: process.env.REDIS_URL ?? "",

    SESSION_COOKIE_SECRET: process.env.SESSION_COOKIE_SECRET ?? "change-me",
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET ?? "change-me",
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET ?? "change-me",

    AUTH_ACCESS_TOKEN_TTL_MINUTES: parse_number(process.env.AUTH_ACCESS_TOKEN_TTL_MINUTES, 15),
    AUTH_REFRESH_TOKEN_TTL_DAYS: parse_number(process.env.AUTH_REFRESH_TOKEN_TTL_DAYS, 14),
    AUTH_LOGIN_MAX_ATTEMPTS: parse_number(process.env.AUTH_LOGIN_MAX_ATTEMPTS, 5),
    AUTH_LOGIN_WINDOW_MINUTES: parse_number(process.env.AUTH_LOGIN_WINDOW_MINUTES, 15),
    AUTH_LOGIN_LOCK_MINUTES: parse_number(process.env.AUTH_LOGIN_LOCK_MINUTES, 15),

    AUTH_COOKIE_ACCESS_NAME: process.env.AUTH_COOKIE_ACCESS_NAME ?? "sm_access_token",
    AUTH_COOKIE_REFRESH_NAME: process.env.AUTH_COOKIE_REFRESH_NAME ?? "sm_refresh_token",
    AUTH_COOKIE_SECURE: parse_boolean(process.env.AUTH_COOKIE_SECURE, false),
    AUTH_COOKIE_DOMAIN: process.env.AUTH_COOKIE_DOMAIN ?? "",
    AUTH_COOKIE_SAME_SITE: parse_same_site(process.env.AUTH_COOKIE_SAME_SITE),

    AUTH_BOOTSTRAP_DEFAULT_PASSWORD: process.env.AUTH_BOOTSTRAP_DEFAULT_PASSWORD ?? "change-me",
    AUTH_BOOTSTRAP_ACCOUNTS_JSON: process.env.AUTH_BOOTSTRAP_ACCOUNTS_JSON ?? ""
  };

  return cache;
}

export function reset_env_cache_for_tests(): void {
  cache = null;
}
