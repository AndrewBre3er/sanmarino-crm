import { auth_role_codes, type AuthRoleCode } from "../../contracts/backoffice-shell.contract";

export interface AuthUserView {
  userId: string;
  login: string;
  displayName: string;
  roleCode: AuthRoleCode;
  optionalRole: boolean;
}

export interface AuthSessionView {
  sessionId: string;
  issuedAt: string;
  refreshExpiresAt: string;
}

export interface AuthSessionSnapshot {
  user: AuthUserView;
  session: AuthSessionView;
}

type ParsedRecord = Record<string, unknown>;

const auth_role_code_set = new Set<AuthRoleCode>(auth_role_codes);

function as_non_empty_string(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function as_auth_role_code(value: unknown): AuthRoleCode | null {
  const roleCode = as_non_empty_string(value);
  if (!roleCode) {
    return null;
  }

  return auth_role_code_set.has(roleCode as AuthRoleCode) ? (roleCode as AuthRoleCode) : null;
}

function as_record(value: unknown): ParsedRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as ParsedRecord;
}

export function get_auth_api_base_url(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";
  return fromEnv.replace(/\/+$/, "");
}

export function build_auth_api_url(pathname: string): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${get_auth_api_base_url()}${normalizedPath}`;
}

export function parse_auth_session_payload(payload: unknown): AuthSessionSnapshot | null {
  const root = as_record(payload);
  if (!root) {
    return null;
  }

  const userRecord = as_record(root.user);
  const sessionRecord = as_record(root.session);
  if (!userRecord || !sessionRecord) {
    return null;
  }

  const roleCode = as_auth_role_code(userRecord.roleCode);
  const userId = as_non_empty_string(userRecord.userId);
  const login = as_non_empty_string(userRecord.login);
  const displayName = as_non_empty_string(userRecord.displayName);
  const sessionId = as_non_empty_string(sessionRecord.sessionId);
  const issuedAt = as_non_empty_string(sessionRecord.issuedAt);
  const refreshExpiresAt = as_non_empty_string(sessionRecord.refreshExpiresAt);

  if (!roleCode || !userId || !login || !displayName || !sessionId || !issuedAt || !refreshExpiresAt) {
    return null;
  }

  return {
    user: {
      userId,
      login,
      displayName,
      roleCode,
      optionalRole: Boolean(userRecord.optionalRole)
    },
    session: {
      sessionId,
      issuedAt,
      refreshExpiresAt
    }
  };
}

export async function fetch_auth_session_by_cookie_header(
  cookieHeader: string | null | undefined
): Promise<AuthSessionSnapshot | null> {
  try {
    const headers: Record<string, string> = {};
    if (cookieHeader && cookieHeader.length > 0) {
      headers.cookie = cookieHeader;
    }

    const response = await fetch(build_auth_api_url("/auth/me"), {
      method: "GET",
      headers,
      cache: "no-store"
    });

    if (response.status === 401 || response.status === 403) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as unknown;
    return parse_auth_session_payload(payload);
  } catch {
    return null;
  }
}

export function extract_set_cookie_headers(sourceResponse: Response): readonly string[] {
  const values = sourceResponse.headers.getSetCookie();
  if (values.length > 0) {
    return values;
  }

  const single = sourceResponse.headers.get("set-cookie");
  return single ? [single] : [];
}

export function append_set_cookie_headers(targetHeaders: Headers, sourceResponse: Response): void {
  for (const cookieHeader of extract_set_cookie_headers(sourceResponse)) {
    targetHeaders.append("set-cookie", cookieHeader);
  }
}
