import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/auth";
import { getFeatureSpecSheet, saveFeatureSpecSheet } from "@/lib/db";
import { fetchWbsTasks, mapWbsTaskToRow, WBS_TASK_ID_KEY, type WbsTask } from "@/lib/wbsSync";

// 마일스톤 시트를 WBS 최신 상태로 다시 가져온다(누를 때마다 새로 반영).
// - WBS에서 온 행(__wbsTaskId 있음)은 최신 내용으로 갱신하되, 결과물·비고처럼
//   WBS에 없는 로컬 전용 필드는 보존한다.
// - WBS에서 삭제된 태스크에 대응하는 행은 제거한다.
// - WBS에 새로 생긴 태스크는 새 행으로 추가한다.
// - __wbsTaskId가 없는 기존 행(공연사업팀 원본, 서비스 기획 항목 등)은 건드리지 않는다.
export async function POST() {
  const user = await requireMasterAdmin();
  if (!user) {
    return NextResponse.json({ error: "마스터 관리자만 접근할 수 있습니다." }, { status: 403 });
  }

  let tasks: WbsTask[];
  try {
    tasks = await fetchWbsTasks();
  } catch {
    return NextResponse.json({ error: "WBS 서버에서 데이터를 가져오지 못했습니다." }, { status: 502 });
  }

  const tasksById = new Map(tasks.map((t) => [t.id, t]));
  const existingRows = getFeatureSpecSheet("마일스톤");

  const seenWbsIds = new Set<string>();
  const updatedRows: Record<string, string>[] = [];
  for (const row of existingRows) {
    const wbsId = row[WBS_TASK_ID_KEY];
    if (!wbsId) {
      updatedRows.push(row);
      continue;
    }
    const task = tasksById.get(wbsId);
    if (!task) continue; // WBS에서 삭제됨 -> 이 행도 제거
    seenWbsIds.add(wbsId);
    updatedRows.push(mapWbsTaskToRow(task, tasksById, row));
  }
  let importedCount = 0;
  for (const task of tasks) {
    if (seenWbsIds.has(task.id)) continue;
    updatedRows.push(mapWbsTaskToRow(task, tasksById, undefined));
    importedCount += 1;
  }
  updatedRows.forEach((row, i) => {
    row["#"] = String(i + 1);
  });

  const saved = saveFeatureSpecSheet("마일스톤", updatedRows);
  return NextResponse.json({ rows: saved, imported: importedCount, total: tasks.length });
}
