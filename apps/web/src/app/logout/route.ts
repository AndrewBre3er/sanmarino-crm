import { NextRequest, NextResponse } from "next/server";
import { append_set_cookie_headers, build_auth_api_url } from "../../lib/auth/auth-session";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let authResponse: Response | null = null;

  try {
    authResponse = await fetch(build_auth_api_url("/auth/logout"), {
      method: "POST",
      headers: {
        cookie: request.headers.get("cookie") ?? ""
      },
      cache: "no-store"
    });
  } catch {
    // Keep logout action idempotent even if auth API is unavailable.
  }

  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  if (authResponse) {
    append_set_cookie_headers(response.headers, authResponse);
  }

  return response;
}
