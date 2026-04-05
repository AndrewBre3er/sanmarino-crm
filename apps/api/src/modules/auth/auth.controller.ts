import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";
import { get_env } from "../../config/env";
import { api_openapi_tags } from "../../contracts/openapi.contract";
import { authenticated_only } from "./auth.access.decorator";
import { AuthAccessGuard } from "./auth.access.guard";
import { get_authenticated_access, type AuthenticatedRequestLike } from "./auth.access.helpers";
import { AuthService } from "./auth.service";
import {
  clear_auth_cookies,
  read_cookie,
  set_auth_cookies,
  type CookieRequestLike,
  type CookieResponseLike
} from "./auth.cookies";

class LoginDto {
  @IsString()
  @MinLength(3)
  login!: string;

  @IsString()
  @MinLength(3)
  password!: string;
}

interface RequestLike extends CookieRequestLike {
  ip?: string;
  headers: CookieRequestLike["headers"] & {
    "x-forwarded-for"?: string | string[];
  };
}

function get_client_ip(request: RequestLike): string {
  const forwardedFor = request.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim().length > 0) {
    const firstIp = forwardedFor.split(",")[0];
    return firstIp?.trim() ?? request.ip ?? "unknown";
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    const firstForwarded = forwardedFor[0]?.trim();
    if (firstForwarded) {
      return firstForwarded;
    }
  }

  return request.ip ?? "unknown";
}

function require_cookie(request: CookieRequestLike, cookieName: string): string {
  const value = read_cookie(request, cookieName);
  if (!value) {
    throw new UnauthorizedException({
      code: "ACCESS_DENIED",
      message: `Cookie '${cookieName}' is missing`
    });
  }

  return value;
}

@ApiTags(api_openapi_tags.auth.name)
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(
    @Body() payload: LoginDto,
    @Req() request: RequestLike,
    @Res({ passthrough: true }) response: CookieResponseLike
  ) {
    const result = await this.authService.login({
      login: payload.login,
      password: payload.password,
      clientIp: get_client_ip(request)
    });

    set_auth_cookies(response, result.tokens);

    return {
      user: result.user,
      session: result.session
    };
  }

  @Post("refresh")
  async refresh(@Req() request: RequestLike, @Res({ passthrough: true }) response: CookieResponseLike) {
    const refreshToken = require_cookie(request, get_env().AUTH_COOKIE_REFRESH_NAME);
    const result = await this.authService.refresh(refreshToken);

    set_auth_cookies(response, result.tokens);

    return {
      user: result.user,
      session: result.session
    };
  }

  @Post("logout")
  async logout(@Req() request: RequestLike, @Res({ passthrough: true }) response: CookieResponseLike) {
    const refreshToken = read_cookie(request, get_env().AUTH_COOKIE_REFRESH_NAME);
    await this.authService.logout(refreshToken);
    clear_auth_cookies(response);

    return {
      success: true
    };
  }

  @Get("me")
  @UseGuards(AuthAccessGuard)
  @authenticated_only()
  async me(@Req() request: RequestLike & AuthenticatedRequestLike) {
    return get_authenticated_access(request);
  }
}
