import { NextResponse } from "next/server";
import { appendSessionClear } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  await appendSessionClear(response);
  return response;
}
