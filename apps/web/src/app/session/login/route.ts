import { NextRequest, NextResponse } from "next/server";
import { resolve_role_home_path } from "../../../contracts/backoffice-shell.contract";
import {
  append_set_cookie_headers,
  build_auth_api_url,
  parse_auth_session_payload
} from "../../../lib/auth/auth-session";

function redirect_to_login(request: NextRequest, errorCode: string): NextResponse {
  const location = new URL("/login", request.url);
  location.searchParams.set("error", errorCode);
  return NextResponse.redirect(location, 303);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const login = String(formData.get("login") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (login.length < 3 || password.length < 3) {
    return redirect_to_login(request, "invalid_input");
  }

  let authResponse: Response;
  try {
    authResponse = await fetch(build_auth_api_url("/auth/login"), {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        login,
        password
      }),
      cache: "no-store"
    });
  } catch {
    return redirect_to_login(request, "auth_api_unavailable");
  }

  if (!authResponse.ok) {
    return redirect_to_login(
      request,
      authResponse.status >= 500 ? "auth_api_unavailable" : "invalid_credentials"
    );
  }

  const payload = (await authResponse.json()) as unknown;
  const session = parse_auth_session_payload(payload);
  if (!session) {
    return redirect_to_login(request, "session_parse_failed");
  }

  const response = NextResponse.redirect(
    new URL(resolve_role_home_path(session.user.primaryRole), request.url),
    303
  );
  append_set_cookie_headers(response.headers, authResponse);

  return response;
}
