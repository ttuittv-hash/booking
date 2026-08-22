import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteNotificationRule, getNotificationRuleById, updateNotificationRule } from "@/lib/db";

function parseThreshold(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null;
}

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await ctx.params;
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

  const rule = await updateNotificationRule(id, {
    label,
    description,
    enabled,
    thresholdDays,
    repeatIntervalDays,
    messageTemplate,
    updatedAt: new Date().toISOString(),
  });
  if (!rule) return NextResponse.json({ error: "알림 트리거를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ rule });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const rule = await getNotificationRuleById(id);
  if (!rule) return NextResponse.json({ error: "알림 트리거를 찾을 수 없습니다." }, { status: 404 });
  if (rule.isSystem) {
    return NextResponse.json(
      { error: "자동 발송에 연동된 기본 트리거는 삭제할 수 없습니다. 끄려면 '사용' 스위치를 꺼주세요." },
      { status: 400 },
    );
  }
  await deleteNotificationRule(id);
  return NextResponse.json({ ok: true });
}
