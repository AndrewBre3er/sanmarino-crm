import { NextResponse, type NextRequest } from "next/server";
import {
  can_access_backoffice_path,
  resolve_role_home_path
} from "./contracts/backoffice-shell.contract";
import { fetch_auth_session_by_cookie_header } from "./lib/auth/auth-session";

function to_login_redirect(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const session = await fetch_auth_session_by_cookie_header(request.headers.get("cookie"));
  const pathname = request.nextUrl.pathname;

  if (pathname === "/login") {
    if (!session) {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL(resolve_role_home_path(session.user.primaryRole), request.url));
  }

  if (pathname.startsWith("/backoffice")) {
    if (!session) {
      return to_login_redirect(request);
    }

    if (
      !can_access_backoffice_path(pathname, session.user.roleCodes, session.user.allowedWorkspaces)
    ) {
      return NextResponse.redirect(new URL(resolve_role_home_path(session.user.primaryRole), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/backoffice/:path*"]
};
