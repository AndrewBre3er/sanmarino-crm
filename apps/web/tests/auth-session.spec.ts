import { describe, expect, it } from "vitest";
import { parse_auth_session_payload } from "../src/lib/auth/auth-session";

describe("auth session payload parsing", () => {
  it("parses DB-backed auth payload with multi-role fields", () => {
    const snapshot = parse_auth_session_payload({
      user: {
        userId: "user-1",
        email: "admin@sanmarino.local",
        login: "admin@sanmarino.local",
        displayName: "Admin User",
        primaryRole: "admin",
        roleCodes: ["admin", "finance"],
        allowedWorkspaces: ["admin", "finance"]
      },
      session: {
        sessionId: "session-1",
        issuedAt: "2026-01-01T00:00:00.000Z",
        refreshExpiresAt: "2026-01-02T00:00:00.000Z"
      }
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot?.user.primaryRole).toBe("admin");
    expect(snapshot?.user.roleCodes).toEqual(["admin", "finance"]);
    expect(snapshot?.user.allowedWorkspaces).toEqual(["admin", "finance"]);
    expect(snapshot?.user.email).toBe("admin@sanmarino.local");
    expect(snapshot?.user.login).toBe("admin@sanmarino.local");
  });

  it("falls back to email/login and roleCode when needed", () => {
    const snapshot = parse_auth_session_payload({
      user: {
        userId: "user-2",
        email: "seller@sanmarino.local",
        displayName: "Seller User",
        roleCode: "seller"
      },
      session: {
        sessionId: "session-2",
        issuedAt: "2026-01-01T00:00:00.000Z",
        refreshExpiresAt: "2026-01-02T00:00:00.000Z"
      }
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot?.user.primaryRole).toBe("seller");
    expect(snapshot?.user.roleCodes).toEqual(["seller"]);
    expect(snapshot?.user.allowedWorkspaces).toEqual(["seller"]);
    expect(snapshot?.user.login).toBe("seller@sanmarino.local");
  });

  it("returns null for payload without valid role identity", () => {
    expect(
      parse_auth_session_payload({
        user: {
          userId: "user-3",
          email: "unknown@sanmarino.local",
          displayName: "Unknown User"
        },
        session: {
          sessionId: "session-3",
          issuedAt: "2026-01-01T00:00:00.000Z",
          refreshExpiresAt: "2026-01-02T00:00:00.000Z"
        }
      })
    ).toBeNull();
  });
});
