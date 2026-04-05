import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { get_env } from "../../config/env";

interface LoginAttemptState {
  windowStartedAtMs: number;
  failureCount: number;
  lockedUntilMs?: number;
}

function normalize_login(login: string): string {
  return login.trim().toLowerCase();
}

function to_rate_key(login: string, clientIp: string): string {
  const ip = clientIp.trim().length > 0 ? clientIp.trim() : "unknown";
  return `${normalize_login(login)}|${ip}`;
}

@Injectable()
export class AuthLoginRateLimitService {
  private readonly states = new Map<string, LoginAttemptState>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly lockMs: number;

  constructor() {
    const env = get_env();
    this.maxAttempts = env.AUTH_LOGIN_MAX_ATTEMPTS;
    this.windowMs = env.AUTH_LOGIN_WINDOW_MINUTES * 60_000;
    this.lockMs = env.AUTH_LOGIN_LOCK_MINUTES * 60_000;
  }

  assert_not_locked(login: string, clientIp: string): void {
    const key = to_rate_key(login, clientIp);
    const state = this.states.get(key);
    if (!state?.lockedUntilMs) {
      return;
    }

    const now = Date.now();
    if (state.lockedUntilMs <= now) {
      this.states.delete(key);
      return;
    }

    throw new HttpException(
      {
        code: "ACCESS_DENIED",
        message: "Too many login attempts. Temporary lock is active.",
        lockUntil: new Date(state.lockedUntilMs).toISOString()
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }

  register_failure(login: string, clientIp: string): void {
    const key = to_rate_key(login, clientIp);
    const now = Date.now();
    const previous = this.states.get(key);

    if (!previous || now - previous.windowStartedAtMs > this.windowMs) {
      this.states.set(key, {
        windowStartedAtMs: now,
        failureCount: 1
      });
      return;
    }

    const nextCount = previous.failureCount + 1;
    const next: LoginAttemptState = {
      windowStartedAtMs: previous.windowStartedAtMs,
      failureCount: nextCount
    };

    if (nextCount >= this.maxAttempts) {
      next.lockedUntilMs = now + this.lockMs;
    }

    this.states.set(key, next);
  }

  clear(login: string, clientIp: string): void {
    this.states.delete(to_rate_key(login, clientIp));
  }
}
