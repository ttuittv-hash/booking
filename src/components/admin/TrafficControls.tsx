import Link from "next/link";
import { btnClass } from "@/components/ui/kit";
import { FIELD_SM, tabCls } from "@/components/admin/adminUi";
import type { TrafficGranularity } from "@/lib/db";
import { GRANULARITIES, RANGE_PRESETS, type ResolvedRange } from "@/lib/trafficRange";

/*
  유입 지표의 기간·단위 조작부 (2026-08-28).

  리포트 요약 화면과 유입 상세 화면이 같은 조작부를 쓴다. 상태는 전부 URL 쿼리에 있고
  자바스크립트가 없어도 동작한다 — 프리셋·단위는 링크, 직접 지정은 평범한 GET 폼이다.
  덕분에 운영자가 특정 기간 화면을 그대로 복사해 공유할 수 있다.
*/

export interface TrafficQuery {
  granularity: TrafficGranularity;
  range: ResolvedRange;
  /** 이 화면이 함께 들고 다녀야 하는 다른 파라미터(예: 리포트 요약의 공간 탭) */
  extra?: Record<string, string | undefined>;
}

/** 현재 조회 상태를 유지한 채 일부만 바꾼 링크를 만든다. */
export function trafficHref(
  basePath: string,
  query: TrafficQuery,
  patch: { g?: TrafficGranularity; days?: number; from?: string; to?: string },
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query.extra ?? {})) {
    if (value) params.set(key, value);
  }

  const granularity = patch.g ?? query.granularity;
  if (granularity !== "day") params.set("g", granularity);

  if (patch.days !== undefined) {
    // 프리셋을 고르면 직접 지정한 날짜는 버린다 — 둘이 함께 남으면 어느 쪽이 이겼는지
    // 화면만 보고는 알 수 없다.
    if (patch.days !== 30) params.set("days", String(patch.days));
  } else if (patch.from || patch.to) {
    params.set("from", patch.from ?? query.range.from);
    params.set("to", patch.to ?? query.range.to);
  } else if (query.range.presetDays !== null) {
    if (query.range.presetDays !== 30) params.set("days", String(query.range.presetDays));
  } else {
    params.set("from", query.range.from);
    params.set("to", query.range.to);
  }

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function TrafficControls({
  basePath,
  query,
}: {
  basePath: string;
  query: TrafficQuery;
}) {
  const { range, granularity } = query;

  return (
    <div className="mt-3 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <nav
          className="flex items-center gap-1 border-b border-border/20"
          aria-label="집계 단위"
        >
          {GRANULARITIES.map((g) => (
            <Link
              key={g.key}
              href={trafficHref(basePath, query, { g: g.key })}
              className={tabCls(g.key === granularity)}
            >
              {g.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-wrap items-center gap-1.5">
          {RANGE_PRESETS.map((p) => (
            <Link
              key={p.days}
              href={trafficHref(basePath, query, { days: p.days })}
              className={btnClass(range.presetDays === p.days ? "primary" : "secondary", "sm")}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 직접 지정 — 평범한 GET 폼이라 자바스크립트 없이도 동작한다. 함께 들고 다녀야 하는
          파라미터는 hidden 으로 실어 보낸다. */}
      <form method="get" action={basePath} className="flex flex-wrap items-end gap-2">
        {Object.entries(query.extra ?? {}).map(([key, value]) =>
          value ? <input key={key} type="hidden" name={key} value={value} /> : null,
        )}
        {granularity !== "day" && <input type="hidden" name="g" value={granularity} />}
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">시작일</span>
          <input type="date" name="from" defaultValue={range.from} max={range.to} className={FIELD_SM} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">종료일</span>
          <input type="date" name="to" defaultValue={range.to} className={FIELD_SM} />
        </label>
        <button type="submit" className={btnClass("secondary", "sm")}>
          기간 적용
        </button>
      </form>

      <p className="text-xs text-muted">
        {range.from} ~ {range.to}
        {range.notice ? <span className="ml-2 text-danger">{range.notice}</span> : null}
      </p>
    </div>
  );
}
