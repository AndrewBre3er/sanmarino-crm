import { NextResponse } from "next/server";
import { web_app_shell_contract } from "../../../contracts/app-shell.contract";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: web_app_shell_contract.service,
    timestamp: new Date().toISOString(),
    version: web_app_shell_contract.version
  });
}
