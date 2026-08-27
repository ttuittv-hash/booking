import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getFeatureSpecSheet, saveFeatureSpecSheet } from "@/lib/db";
import { FEATURE_SPEC_SHEET_KEYS, type FeatureSpecSheetKey } from "@/lib/pricing/types";

// [개정 2026-08-20] 마스터 관리자로 제한하지 않는다(사용자 요청) — 운영자면 누구나 조회·수정.
// [2026-08-28 보안 점검] 인증 자체가 없어 인터넷 어디서나 내부 기획 문서를 읽고 덮어쓸 수 있었다.
// 화면(/admin/feature-spec)이 운영자 전용이므로 API 도 최소 운영자 로그인은 요구한다.
function isValidSheetKey(key: string): key is FeatureSpecSheetKey {
  return (FEATURE_SPEC_SHEET_KEYS as readonly string[]).includes(key);
}

async function requireAdmin(): Promise<NextResponse | null> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "운영자만 이용할 수 있습니다." }, { status: 403 });
  return null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ sheetKey: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { sheetKey } = await params;
  const key = decodeURIComponent(sheetKey);
  if (!isValidSheetKey(key)) {
    return NextResponse.json({ error: "존재하지 않는 표입니다." }, { status: 404 });
  }
  return NextResponse.json({ rows: await getFeatureSpecSheet(key) });
}

export async function PUT(request: Request, { params }: { params: Promise<{ sheetKey: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { sheetKey } = await params;
  const key = decodeURIComponent(sheetKey);
  if (!isValidSheetKey(key)) {
    return NextResponse.json({ error: "존재하지 않는 표입니다." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.rows)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const rows = body.rows.filter(
    (row: unknown): row is Record<string, string> =>
      !!row &&
      typeof row === "object" &&
      Object.values(row as Record<string, unknown>).every((v) => typeof v === "string"),
  );
  if (rows.length !== body.rows.length) {
    return NextResponse.json({ error: "행 데이터 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const saved = await saveFeatureSpecSheet(key, rows);
  return NextResponse.json({ rows: saved });
}
