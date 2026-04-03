import { NextResponse } from "next/server";
import { web_app_shell_contract } from "../../../contracts/app-shell.contract";

export async function GET() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBase) {
    return NextResponse.json(
      {
        status: "not_ready",
        service: web_app_shell_contract.service,
        reason: "NEXT_PUBLIC_API_BASE_URL is not set"
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: "ok",
    service: web_app_shell_contract.service,
    timestamp: new Date().toISOString()
  });
}
