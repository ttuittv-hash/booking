import { NextResponse } from "next/server";
import { getFeatureSpecSheet, saveFeatureSpecSheet } from "@/lib/db";
import { FEATURE_SPEC_SHEET_KEYS, type FeatureSpecSheetKey } from "@/lib/pricing/types";

// [개정 2026-08-20] 이 문서는 로그인 없이 누구나 조회·수정할 수 있다(사용자 요청) —
// 더 이상 마스터 관리자로 제한하지 않는다.
function isValidSheetKey(key: string): key is FeatureSpecSheetKey {
  return (FEATURE_SPEC_SHEET_KEYS as readonly string[]).includes(key);
}

export async function GET(_request: Request, { params }: { params: Promise<{ sheetKey: string }> }) {
  const { sheetKey } = await params;
  const key = decodeURIComponent(sheetKey);
  if (!isValidSheetKey(key)) {
    return NextResponse.json({ error: "존재하지 않는 표입니다." }, { status: 404 });
  }
  return NextResponse.json({ rows: await getFeatureSpecSheet(key) });
}

export async function PUT(request: Request, { params }: { params: Promise<{ sheetKey: string }> }) {
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
