import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { countOpenInquiries } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  return NextResponse.json({ count: await countOpenInquiries() }, { headers: { "Cache-Control": "no-store" } });
}
