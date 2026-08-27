import type { ReactNode } from "react";

/* ============================================================================
   목록 표 — 마이페이지의 신청·티켓오픈·시설회의·정산 목록이 같은 리듬을 쓴다.

   디자인 시스템의 표 규칙을 그대로 따른다 — 박스·색면·세로선 없이 헤어라인만,
   헤더는 12 muted, 값은 14, 금액·수량은 우측 정렬 + tabular-nums.
   좁은 화면에서는 표를 억지로 접지 않고 가로로만 스크롤한다(열 대응이 깨지면
   어느 값이 어느 항목인지 못 읽는다).
   ========================================================================= */

export interface Column {
  key: string;
  label: string;
  /** 금액·수량은 우측 정렬 — 숫자 기둥이 맞아야 비교가 된다 */
  align?: "left" | "right";
  /** 표 안 인라인 액션 열처럼 제목이 필요 없는 열 */
  srOnly?: boolean;
  width?: string;
}

export function DataTable({
  columns,
  rows,
  empty,
  minWidth = "44rem",
  className = "",
}: {
  columns: Column[];
  /** 행마다 `{ key: 셀 }` — 열 key 와 짝을 맞춘다 */
  rows: { id: string; cells: Record<string, ReactNode> }[];
  empty: ReactNode;
  minWidth?: string;
  className?: string;
}) {
  return (
    /*
      `contain: paint` 가 없으면 표의 넘치는 폭이 문서 전체 가로 스크롤로 새어 나간다
      (좌측 스티키 메뉴와 같은 그리드 안에 있을 때 Chromium 에서 재현). 표는 자기 안에서만
      스크롤해야 하므로 페인트 격리를 명시한다.
    */
    <div className={`overflow-x-auto [contain:paint] ${className}`}>
      <table className="w-full border-collapse text-s" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-border/40">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                style={c.width ? { width: c.width } : undefined}
                className={`py-3 pr-6 text-xs font-bold text-muted last:pr-0 ${
                  c.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {c.srOnly ? <span className="sr-only">{c.label}</span> : c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-14 text-center text-s text-muted">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="border-b border-border/15">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`py-4 pr-6 align-top last:pr-0 ${
                      c.align === "right" ? "text-right tabular-nums" : "text-left"
                    }`}
                  >
                    {r.cells[c.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/** 목록 아래 총 건수 — 페이지네이션이 없을 때도 항상 같은 자리에 둔다 */
