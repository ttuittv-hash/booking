// 니키님이 별도로 만든 "OS Studio"(SA 리포지토리) WBS 도구와의 연동.
// 대관 관리 시스템 프로그램의 WBS 태스크를 기능정의서 "마일스톤" 시트로 가져오고,
// 그 시트에서 편집한 내용을 다시 WBS로 반영(push)한다.
//
// 매핑 방식(WBS에는 대/중/소구분 3단계가 없어서 완전히 1:1은 아님):
//   상위 태스크가 있으면 → 중구분=상위 태스크 제목, 소구분=자기 label
//   상위 태스크가 없으면 → 중구분=자기 label, 소구분=빈 값
//   진행 업무=title, 담당자=owner, 기한=startDate~endDate, 상태=status
//   결과물·비고는 WBS에 없는 필드라 로컬에만 저장되고 재동기화해도 보존된다.
//   대구분/중구분(상위 태스크 소속)은 WBS 쪽 계층을 바꾸는 것과 같아서 이 시스템에서는
//   되돌려 쓰지 않는다 — 소구분(label)·진행 업무·담당자·기한·상태만 양방향 동기화된다.

export const WBS_API_BASE = "https://sa-ty5b.vercel.app";
export const WBS_VENUE_PROGRAM_ID = "cmsj51i8x002d82lm7svk1a4f";

export const WBS_TASK_ID_KEY = "__wbsTaskId";
export const WBS_PARENT_ID_KEY = "__wbsParentId";

export interface WbsTask {
  id: string;
  programId: string;
  label: string;
  title: string;
  owner: string;
  startDate: string;
  endDate: string;
  status: string;
  order: number;
  parentId: string | null;
}

export async function fetchWbsTasks(): Promise<WbsTask[]> {
  const res = await fetch(`${WBS_API_BASE}/api/wbs-tasks?programId=${WBS_VENUE_PROGRAM_ID}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`WBS 서버 응답 오류 (${res.status})`);
  return (await res.json()) as WbsTask[];
}

export function formatDue(startDate: string, endDate: string): string {
  if (startDate && endDate && startDate !== endDate) return `${startDate}~${endDate}`;
  return startDate || endDate || "";
}

export function parseDue(due: string): { startDate: string; endDate: string } {
  const trimmed = due.trim();
  if (trimmed.includes("~")) {
    const [start, end] = trimmed.split("~", 2).map((s) => s.trim());
    return { startDate: start ?? "", endDate: end ?? trimmed };
  }
  return { startDate: trimmed, endDate: trimmed };
}

export function mapWbsTaskToRow(
  task: WbsTask,
  tasksById: Map<string, WbsTask>,
  prevRow: Record<string, string> | undefined,
): Record<string, string> {
  const parent = task.parentId ? tasksById.get(task.parentId) : undefined;
  return {
    "#": prevRow?.["#"] ?? "",
    "대구분": "대관 WBS",
    "중구분": parent ? parent.title : task.label || "",
    "소구분": parent ? task.label || "" : "",
    "진행 업무": task.title,
    "결과물": prevRow?.["결과물"] ?? "",
    "담당자": task.owner,
    "기한": formatDue(task.startDate, task.endDate),
    "상태": task.status,
    "비고": prevRow?.["비고"] ?? "",
    [WBS_TASK_ID_KEY]: task.id,
    [WBS_PARENT_ID_KEY]: task.parentId ?? "",
  };
}

// 기능정의서 "마일스톤" 시트에서 편집된 값을 WBS 쪽 태스크로 반영한다.
// 대구분/중구분(상위 태스크 소속)은 되돌려 쓰지 않는다.
export async function pushRowToWbs(row: Record<string, string>): Promise<void> {
  const taskId = row[WBS_TASK_ID_KEY];
  if (!taskId) return;
  const { startDate, endDate } = parseDue(row["기한"] ?? "");
  await fetch(`${WBS_API_BASE}/api/wbs-tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      label: row["소구분"] || row["중구분"] || "",
      title: row["진행 업무"] ?? "",
      owner: row["담당자"] ?? "",
      startDate,
      endDate,
      status: row["상태"] ?? "",
    }),
  });
}
