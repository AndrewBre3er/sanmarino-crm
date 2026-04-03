import type { Env } from "./env.schema";

let cache: Env | null = null;

export function get_env(): Env {
  if (cache) {
    return cache;
  }

  cache = {
    NODE_ENV: process.env.NODE_ENV ?? "development",
    API_HOST: process.env.API_HOST ?? "0.0.0.0",
    API_PORT: Number(process.env.API_PORT ?? 4000),
    DATABASE_URL: process.env.DATABASE_URL ?? "",
    REDIS_URL: process.env.REDIS_URL ?? ""
  };
  return cache;
}
