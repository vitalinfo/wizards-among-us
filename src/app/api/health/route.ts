import { NextResponse } from "next/server";

// Keep-warm ping target (plan §3, §8). Prevents an idle free-tier database
// from suspending; also a basic liveness endpoint for monitoring.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok" });
}
