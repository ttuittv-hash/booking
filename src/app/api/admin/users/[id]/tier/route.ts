import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/auth";
import { setAdminTier } from "@/lib/db";
import type { AdminTier } from "@/lib/pricing/types";

const VALID_TIERS: AdminTier[] = ["BASIC", "PRO", "MASTER"];

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireMasterAdmin();
  if (!user) {
    return NextResponse.json({ error: "마스터 관리자만 등급을 변경할 수 있습니다." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const tier = body?.tier as AdminTier | undefined;
  if (!tier || !VALID_TIERS.includes(tier)) {
    return NextResponse.json({ error: "올바르지 않은 등급입니다." }, { status: 400 });
  }

  try {
    const updated = setAdminTier(id, tier);
    return NextResponse.json({ user: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "등급 변경에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
