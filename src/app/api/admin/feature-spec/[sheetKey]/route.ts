import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/auth";
import { getFeatureSpecSheet, saveFeatureSpecSheet } from "@/lib/db";
import { FEATURE_SPEC_SHEET_KEYS, type FeatureSpecSheetKey } from "@/lib/pricing/types";
import { pushRowToWbs, WBS_TASK_ID_KEY } from "@/lib/wbsSync";

function isValidSheetKey(key: string): key is FeatureSpecSheetKey {
  return (FEATURE_SPEC_SHEET_KEYS as readonly string[]).includes(key);
}

export async function GET(_request: Request, { params }: { params: Promise<{ sheetKey: string }> }) {
  const user = await requireMasterAdmin();
  if (!user) {
    return NextResponse.json({ error: "마스터 관리자만 접근할 수 있습니다." }, { status: 403 });
  }
  const { sheetKey } = await params;
  const key = decodeURIComponent(sheetKey);
  if (!isValidSheetKey(key)) {
    return NextResponse.json({ error: "존재하지 않는 표입니다." }, { status: 404 });
  }
  return NextResponse.json({ rows: getFeatureSpecSheet(key) });
}

export async function PUT(request: Request, { params }: { params: Promise<{ sheetKey: string }> }) {
  const user = await requireMasterAdmin();
  if (!user) {
    return NextResponse.json({ error: "마스터 관리자만 접근할 수 있습니다." }, { status: 403 });
  }
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

  const saved = saveFeatureSpecSheet(key, rows);

  // 마일스톤 시트는 WBS에서 가져온 행(__wbsTaskId 있음)이 편집되면 WBS 쪽에도 반영한다.
  // WBS 서버가 잠깐 안 되더라도 우리 쪽 저장 자체는 이미 끝난 뒤라 실패해도 무시한다.
  if (key === "마일스톤") {
    const wbsLinkedRows = saved.filter((row) => row[WBS_TASK_ID_KEY]);
    await Promise.allSettled(wbsLinkedRows.map((row) => pushRowToWbs(row)));
  }

  return NextResponse.json({ rows: saved });
}
