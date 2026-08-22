import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { createNotificationRule, listNotificationRules } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }
  return NextResponse.json({ rules: await listNotificationRules() });
}

function parseThreshold(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const messageTemplate = typeof body?.messageTemplate === "string" ? body.messageTemplate.trim() : "";
  if (!label || !description || !messageTemplate) {
    return NextResponse.json({ error: "이름·설명·안내 문구를 모두 입력하세요." }, { status: 400 });
  }
  const enabled = body?.enabled !== false;
  const thresholdDays = parseThreshold(body?.thresholdDays);
  const repeatIntervalDays = parseThreshold(body?.repeatIntervalDays);

  const rule = await createNotificationRule({
    id: crypto.randomUUID(),
    // 운영자가 직접 추가하는 항목은 코드에서 참조하는 시스템 typeCode와 겹치지 않도록
    // 접두어를 붙인 임의 식별자를 쓴다 — 화면에는 노출하지 않는 내부용 값이다.
    typeCode: `CUSTOM_${crypto.randomUUID()}`,
    label,
    description,
    enabled,
    thresholdDays,
    repeatIntervalDays,
    messageTemplate,
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json({ rule });
}
