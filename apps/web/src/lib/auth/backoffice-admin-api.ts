import "server-only";

import { cookies } from "next/headers";
import { build_auth_api_url } from "./auth-session";

export interface AdminUserListItem {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  departmentCode: string | null;
  roleCodes: readonly string[];
  primaryRole: string | null;
}

export interface AdminRoleListItem {
  id: string;
  code: string;
  name: string;
  status: string;
  departmentCode: string | null;
}

export interface AdminPermissionListItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

function is_record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

async function fetch_admin_list<T>(pathname: string): Promise<{ data: T[]; error: string | null }> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const response = await fetch(build_auth_api_url(pathname), {
      method: "GET",
      headers: {
        cookie: cookieHeader
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return {
        data: [],
        error: `Backend request failed with status ${response.status}.`
      };
    }

    const payload = (await response.json()) as unknown;
    if (!is_record(payload) || !Array.isArray(payload.data)) {
      return {
        data: [],
        error: "Backend response has invalid shape."
      };
    }

    const data = payload.data as T[];

    return {
      data,
      error: null
    };
  } catch {
    return {
      data: [],
      error: "Backend is unavailable."
    };
  }
}

export async function fetch_admin_users(): Promise<{
  data: AdminUserListItem[];
  error: string | null;
}> {
  return fetch_admin_list<AdminUserListItem>("/users");
}

export async function fetch_admin_roles(): Promise<{
  data: AdminRoleListItem[];
  error: string | null;
}> {
  return fetch_admin_list<AdminRoleListItem>("/roles");
}

export async function fetch_admin_permissions(): Promise<{
  data: AdminPermissionListItem[];
  error: string | null;
}> {
  return fetch_admin_list<AdminPermissionListItem>("/permissions");
}
