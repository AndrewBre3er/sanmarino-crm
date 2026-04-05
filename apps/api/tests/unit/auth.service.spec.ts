import { HttpException, HttpStatus, UnauthorizedException } from "@nestjs/common";
import { RecordStatus } from "@prisma/client";
import { createHash, scryptSync } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { reset_env_cache_for_tests } from "../../src/config/env";
import { AuthPrismaAccountsService } from "../../src/modules/auth/auth.prisma-accounts";
import { AuthLoginRateLimitService } from "../../src/modules/auth/auth.rate-limit";
import { AuthService } from "../../src/modules/auth/auth.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

interface AuthUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  isActive: boolean;
  userRoles: Array<{
    role: {
      code: string;
      status: RecordStatus;
    };
  }>;
}

function hash_seed_password(email: string, password: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  const saltHex = createHash("sha256")
    .update(`sanmarino-seed:${normalizedEmail}`)
    .digest("hex")
    .slice(0, 32);
  const derivedHex = scryptSync(password, Buffer.from(saltHex, "hex"), 64).toString("hex");
  return `scrypt:${saltHex}:${derivedHex}`;
}

function create_prisma_stub(users: AuthUserRecord[]): PrismaService {
  const byEmail = new Map(users.map((user) => [user.email, user]));
  const byId = new Map(users.map((user) => [user.id, user]));

  return {
    usersUser: {
      findUnique: vi.fn(async (args: { where?: { email?: string; id?: string } }) => {
        const where = args.where ?? {};
        if (where.email) {
          return byEmail.get(where.email) ?? null;
        }
        if (where.id) {
          return byId.get(where.id) ?? null;
        }
        return null;
      })
    }
  } as unknown as PrismaService;
}

function create_auth_service(users: AuthUserRecord[]) {
  const prismaService = create_prisma_stub(users);
  const accountsService = new AuthPrismaAccountsService(prismaService);
  const rateLimitService = new AuthLoginRateLimitService();
  return new AuthService(accountsService, rateLimitService);
}

describe("auth service skeleton", () => {
  afterEach(() => {
    reset_env_cache_for_tests();
    vi.unstubAllEnvs();
  });

  it("issues login tokens and resolves current user from access token", async () => {
    const login = "seller.bootstrap@local";
    const authService = create_auth_service([
      {
        id: "user-seller",
        email: login,
        passwordHash: hash_seed_password(login, "change-me"),
        displayName: "DB Seller",
        isActive: true,
        userRoles: [
          { role: { code: "seller", status: RecordStatus.ACTIVE } },
          { role: { code: "logistics", status: RecordStatus.ACTIVE } }
        ]
      }
    ]);

    const loginResult = await authService.login({
      login,
      password: "change-me",
      clientIp: "127.0.0.1"
    });

    expect(loginResult.user.email).toBe(login);
    expect(loginResult.user.login).toBe(login);
    expect(loginResult.user.displayName).toBe("DB Seller");
    expect(loginResult.user.roleCodes).toEqual(["seller", "logistics"]);
    expect(loginResult.user.allowedWorkspaces).toEqual(["seller", "logistics"]);
    expect(loginResult.user.primaryRole).toBe("seller");
    expect(loginResult.user.roleCode).toBe("seller");

    const me = await authService.get_current_user(loginResult.tokens.accessToken);
    expect(me.user.userId).toBe(loginResult.user.userId);
    expect(me.user.email).toBe(login);
    expect(me.user.roleCodes).toEqual(["seller", "logistics"]);
    expect(me.user.allowedWorkspaces).toEqual(["seller", "logistics"]);
    expect(me.user.roleCode).toBe("seller");
  });

  it("does not allow inactive user login", async () => {
    const login = "finance.bootstrap@local";
    const authService = create_auth_service([
      {
        id: "user-finance",
        email: login,
        passwordHash: hash_seed_password(login, "change-me"),
        displayName: "DB Finance",
        isActive: false,
        userRoles: [{ role: { code: "finance", status: RecordStatus.ACTIVE } }]
      }
    ]);

    await expect(
      authService.login({
        login,
        password: "change-me",
        clientIp: "127.0.0.1"
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rotates refresh token and revokes session on stale refresh token reuse", async () => {
    const login = "finance.bootstrap@local";
    const authService = create_auth_service([
      {
        id: "user-finance",
        email: login,
        passwordHash: hash_seed_password(login, "change-me"),
        displayName: "DB Finance",
        isActive: true,
        userRoles: [{ role: { code: "finance", status: RecordStatus.ACTIVE } }]
      }
    ]);

    const loginResult = await authService.login({
      login,
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
    const login = "warehouse.bootstrap@local";
    const authService = create_auth_service([
      {
        id: "user-warehouse",
        email: login,
        passwordHash: hash_seed_password(login, "change-me"),
        displayName: "DB Warehouse",
        isActive: true,
        userRoles: [{ role: { code: "warehouse", status: RecordStatus.ACTIVE } }]
      }
    ]);

    const loginResult = await authService.login({
      login,
      password: "change-me",
      clientIp: "127.0.0.1"
    });

    await authService.logout(loginResult.tokens.refreshToken);

    await expect(authService.get_current_user(loginResult.tokens.accessToken)).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it("applies temporary lock after repeated failed login attempts", async () => {
    vi.stubEnv("AUTH_LOGIN_MAX_ATTEMPTS", "2");
    vi.stubEnv("AUTH_LOGIN_LOCK_MINUTES", "5");
    vi.stubEnv("AUTH_LOGIN_WINDOW_MINUTES", "5");

    const login = "seller.bootstrap@local";
    const authService = create_auth_service([
      {
        id: "user-seller",
        email: login,
        passwordHash: hash_seed_password(login, "change-me"),
        displayName: "DB Seller",
        isActive: true,
        userRoles: [{ role: { code: "seller", status: RecordStatus.ACTIVE } }]
      }
    ]);

    await expect(
      authService.login({
        login,
        password: "wrong-password",
        clientIp: "127.0.0.1"
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);

    await expect(
      authService.login({
        login,
        password: "wrong-password",
        clientIp: "127.0.0.1"
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);

    try {
      await authService.login({
        login,
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
