import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthSessionSnapshot } from "./auth-session";
import { fetch_auth_session_by_cookie_header } from "./auth-session";

export async function read_current_session(): Promise<AuthSessionSnapshot | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  return fetch_auth_session_by_cookie_header(cookieHeader);
}

export async function require_current_session(): Promise<AuthSessionSnapshot> {
  const session = await read_current_session();
  if (!session) {
    redirect("/login");
  }

  return session;
}
