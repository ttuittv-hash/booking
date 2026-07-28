"use client";

import type { QuoteSelection } from "@/lib/pricing/types";

const DAYS = ["화", "수", "목", "금", "토", "일", "월"];
const YEARS = [2026, 2027, 2028];
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const WEEKS = [1, 2, 3, 4, 5];

export function Step2Week({
  week,
  extraWeeks,
  onChangeWeek,
  onChangeExtraWeeks,
}: {
  week: QuoteSelection["week"];
  extraWeeks: number;
  onChangeWeek: (week: QuoteSelection["week"]) => void;
  onChangeExtraWeeks: (value: number) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-background p-7">
      <h2 className="text-[19px] font-semibold">2. 주차(기간) 선택</h2>
      <p className="mt-1.5 text-[13.5px] text-muted">
        최소 단위는 1일이 아니라 <b className="text-foreground">1주(화~일)</b>
        입니다. 주차를 고르면 요일이 자동 적용됩니다.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <Field label="연도">
          <select
            value={week.year}
            onChange={(e) => onChangeWeek({ ...week, year: Number(e.target.value) })}
            className="select"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </Field>
        <Field label="월">
          <select
            value={week.month}
            onChange={(e) => onChangeWeek({ ...week, month: Number(e.target.value) })}
            className="select"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
        </Field>
        <Field label="주차">
          <select
            value={week.weekOfMonth}
            onChange={(e) =>
              onChangeWeek({ ...week, weekOfMonth: Number(e.target.value) })
            }
            className="select"
          >
            {WEEKS.map((w) => (
              <option key={w} value={w}>
                {w}주차
              </option>
            ))}
          </select>
        </Field>
        <Field label="초과 주차 (추가)">
          <input
            type="number"
            min={0}
            max={8}
            value={extraWeeks}
            onChange={(e) =>
              onChangeExtraWeeks(Math.max(0, Number(e.target.value) || 0))
            }
            className="select w-24 text-center"
          />
        </Field>
      </div>

      <div className="mt-5 text-[14px] font-medium text-accent">
        {week.year}년 {week.month}월 {week.weekOfMonth}주차 · 총{" "}
        {1 + extraWeeks}주 적용
      </div>

      <div className="mt-4 grid max-w-xl grid-cols-7 gap-2">
        {DAYS.map((d, i) => {
          const isOff = i === 6; // 월요일 제외
          return (
            <div
              key={d}
              className={[
                "rounded-xl border py-3 text-center text-[12.5px]",
                isOff
                  ? "border-border/70 bg-panel text-muted opacity-50"
                  : "border-accent/30 bg-accent-soft font-semibold text-accent",
              ].join(" ")}
            >
              <div>{d}</div>
              <div className="mt-0.5 text-[10px] font-normal opacity-80">
                {isOff ? "제외" : "대관"}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .select {
          border: 1px solid var(--border);
          background: var(--panel);
          border-radius: 0.75rem;
          padding: 0.6rem 0.75rem;
          font-size: 14px;
          min-width: 92px;
          outline: none;
        }
        .select:focus {
          border-color: var(--accent);
        }
      `}</style>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12.5px] font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}
