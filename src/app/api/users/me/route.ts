import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateUserProfile } from "@/lib/db";

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "이름을 입력하세요." }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "휴대폰 번호를 입력하세요." }, { status: 400 });
  }

  const updated = updateUserProfile(user.id, { name, phone });
  return NextResponse.json({ user: updated });
}
