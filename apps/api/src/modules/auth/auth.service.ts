import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { get_env } from "../../config/env";
import { AuthBootstrapAccountsService } from "./auth.bootstrap-accounts";
import type { AuthPrincipal, AuthSessionView, IssuedTokenPair } from "./auth.contract";
import { AuthLoginRateLimitService } from "./auth.rate-limit";
import {
  issue_access_token,
  issue_refresh_token,
  verify_access_token,
  verify_refresh_token
} from "./auth.tokens";

interface SessionRecord {
  sessionId: string;
  userId: string;
  roleCode: AuthPrincipal["roleCode"];
  issuedAt: string;
  refreshExpiresAt: string;
  refreshTokenHashHex: string;
  revokedAt?: string;
}

export interface LoginInput {
  login: string;
  password: string;
  clientIp: string;
}

export interface AuthIssueResult {
  user: AuthPrincipal;
  session: AuthSessionView;
  tokens: IssuedTokenPair;
}

function to_unauthorized(message: string): UnauthorizedException {
  return new UnauthorizedException({
    code: "ACCESS_DENIED",
    message
  });
}

@Injectable()
export class AuthService {
  private readonly sessions = new Map<string, SessionRecord>();

  constructor(
    private readonly accountsService: AuthBootstrapAccountsService,
    private readonly loginRateLimitService: AuthLoginRateLimitService
  ) {}

  async login(input: LoginInput): Promise<AuthIssueResult> {
    const normalizedLogin = input.login.trim().toLowerCase();
    this.loginRateLimitService.assert_not_locked(normalizedLogin, input.clientIp);

    const principal = this.accountsService.verify_credentials(normalizedLogin, input.password);
    if (!principal) {
      this.loginRateLimitService.register_failure(normalizedLogin, input.clientIp);
      throw to_unauthorized("Invalid login or password");
    }

    this.loginRateLimitService.clear(normalizedLogin, input.clientIp);
    return this.issue_tokens_for_principal(principal);
  }

  async refresh(refreshToken: string): Promise<AuthIssueResult> {
    const refreshPayload = verify_refresh_token(refreshToken);
    const session = this.sessions.get(refreshPayload.sid);
    if (!session || session.revokedAt) {
      throw to_unauthorized("Session is not active");
    }

    const now = Date.now();
    if (now > Date.parse(session.refreshExpiresAt)) {
      this.revoke_session(session.sessionId);
      throw to_unauthorized("Session is expired");
    }

    const refreshHashHex = this.hash_refresh_token(refreshToken);
    const expectedHash = Buffer.from(session.refreshTokenHashHex, "hex");
    const actualHash = Buffer.from(refreshHashHex, "hex");
    const hashMatches =
      expectedHash.length === actualHash.length && timingSafeEqual(expectedHash, actualHash);

    if (!hashMatches) {
      this.revoke_session(session.sessionId);
      throw to_unauthorized("Refresh token has been rotated");
    }

    if (session.userId !== refreshPayload.sub || session.roleCode !== refreshPayload.role) {
      this.revoke_session(session.sessionId);
      throw to_unauthorized("Session context is invalid");
    }

    const principal = this.accountsService.get_by_user_id(session.userId);
    if (!principal) {
      this.revoke_session(session.sessionId);
      throw to_unauthorized("Account is unavailable");
    }

    return this.issue_tokens_for_principal(principal, session.sessionId);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = verify_refresh_token(refreshToken);
      this.revoke_session(payload.sid);
    } catch {
      // Keep logout idempotent for missing/expired/invalid cookies.
    }
  }

  async get_current_user(accessToken: string): Promise<{
    user: AuthPrincipal;
    session: AuthSessionView;
  }> {
    const accessPayload = verify_access_token(accessToken);
    const session = this.sessions.get(accessPayload.sid);
    if (!session || session.revokedAt) {
      throw to_unauthorized("Session is not active");
    }

    if (session.userId !== accessPayload.sub || session.roleCode !== accessPayload.role) {
      throw to_unauthorized("Session context is invalid");
    }

    const principal = this.accountsService.get_by_user_id(session.userId);
    if (!principal) {
      throw to_unauthorized("Account is unavailable");
    }

    return {
      user: principal,
      session: {
        sessionId: session.sessionId,
        issuedAt: session.issuedAt,
        refreshExpiresAt: session.refreshExpiresAt
      }
    };
  }

  private issue_tokens_for_principal(
    principal: AuthPrincipal,
    existingSessionId?: string
  ): AuthIssueResult {
    const sessionId = existingSessionId ?? randomUUID();
    const access = issue_access_token(principal.userId, sessionId, principal.roleCode);
    const refresh = issue_refresh_token(principal.userId, sessionId, principal.roleCode);
    const refreshTokenHashHex = this.hash_refresh_token(refresh.token);

    this.sessions.set(sessionId, {
      sessionId,
      userId: principal.userId,
      roleCode: principal.roleCode,
      issuedAt: new Date(access.payload.iat * 1000).toISOString(),
      refreshExpiresAt: new Date(refresh.payload.exp * 1000).toISOString(),
      refreshTokenHashHex
    });

    return {
      user: principal,
      session: {
        sessionId,
        issuedAt: new Date(access.payload.iat * 1000).toISOString(),
        refreshExpiresAt: new Date(refresh.payload.exp * 1000).toISOString()
      },
      tokens: {
        accessToken: access.token,
        refreshToken: refresh.token
      }
    };
  }

  private revoke_session(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    this.sessions.set(sessionId, {
      ...session,
      revokedAt: new Date().toISOString()
    });
  }

  private hash_refresh_token(token: string): string {
    const secret = get_env().SESSION_COOKIE_SECRET;
    return createHmac("sha256", secret).update(token).digest("hex");
  }
}
