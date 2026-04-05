import { HttpException, HttpStatus, UnauthorizedException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { reset_env_cache_for_tests } from "../../src/config/env";
import { AuthBootstrapAccountsService } from "../../src/modules/auth/auth.bootstrap-accounts";
import { AuthLoginRateLimitService } from "../../src/modules/auth/auth.rate-limit";
import { AuthService } from "../../src/modules/auth/auth.service";

function create_auth_service() {
  const accountsService = new AuthBootstrapAccountsService();
  const rateLimitService = new AuthLoginRateLimitService();
  return new AuthService(accountsService, rateLimitService);
}

describe("auth service skeleton", () => {
  afterEach(() => {
    reset_env_cache_for_tests();
    vi.unstubAllEnvs();
  });

  it("issues login tokens and resolves current user from access token", async () => {
    vi.stubEnv("AUTH_BOOTSTRAP_DEFAULT_PASSWORD", "change-me");

    const authService = create_auth_service();
    const loginResult = await authService.login({
      login: "seller.bootstrap@local",
      password: "change-me",
      clientIp: "127.0.0.1"
    });

    expect(loginResult.user.roleCode).toBe("seller");

    const me = await authService.get_current_user(loginResult.tokens.accessToken);
    expect(me.user.userId).toBe(loginResult.user.userId);
    expect(me.user.roleCode).toBe("seller");
  });

  it("rotates refresh token and revokes session on stale refresh token reuse", async () => {
    vi.stubEnv("AUTH_BOOTSTRAP_DEFAULT_PASSWORD", "change-me");

    const authService = create_auth_service();
    const loginResult = await authService.login({
      login: "finance.bootstrap@local",
      password: "change-me",
      clientIp: "127.0.0.1"
    });

    const rotated = await authService.refresh(loginResult.tokens.refreshToken);
    expect(rotated.tokens.refreshToken).not.toBe(loginResult.tokens.refreshToken);

    await expect(authService.refresh(loginResult.tokens.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it("revokes active session on logout", async () => {
    vi.stubEnv("AUTH_BOOTSTRAP_DEFAULT_PASSWORD", "change-me");

    const authService = create_auth_service();
    const loginResult = await authService.login({
      login: "warehouse.bootstrap@local",
      password: "change-me",
      clientIp: "127.0.0.1"
    });

    await authService.logout(loginResult.tokens.refreshToken);

    await expect(authService.get_current_user(loginResult.tokens.accessToken)).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it("applies temporary lock after repeated failed login attempts", async () => {
    vi.stubEnv("AUTH_BOOTSTRAP_DEFAULT_PASSWORD", "change-me");
    vi.stubEnv("AUTH_LOGIN_MAX_ATTEMPTS", "2");
    vi.stubEnv("AUTH_LOGIN_LOCK_MINUTES", "5");
    vi.stubEnv("AUTH_LOGIN_WINDOW_MINUTES", "5");

    const authService = create_auth_service();

    await expect(
      authService.login({
        login: "seller.bootstrap@local",
        password: "wrong-password",
        clientIp: "127.0.0.1"
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);

    await expect(
      authService.login({
        login: "seller.bootstrap@local",
        password: "wrong-password",
        clientIp: "127.0.0.1"
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);

    try {
      await authService.login({
        login: "seller.bootstrap@local",
        password: "change-me",
        clientIp: "127.0.0.1"
      });
      expect.unreachable("Expected temporary lock exception");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });
});
