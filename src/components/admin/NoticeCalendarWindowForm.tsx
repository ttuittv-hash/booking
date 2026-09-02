"use client";

/*
  공지 캘린더 노출 월 (2026-09-02).

  공지사항 본문에 넣는 「대관 현황 캘린더」가 **어느 달을 보여 줄지**를 정한다.
  이번 회차가 2027년 하반기면 2027-07 ~ 2027-12 만 넘겨 보게 두는 식이다.
  캘린더를 켜고 끄는 설정이 아니다 — 캘린더는 늘 열려 있고, 여기서 정하는 건
  첫 화면에 뜨는 달과 이전/다음 달로 넘길 수 있는 범위다.
*/

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatMonth,
  initialCalendarMonth,
  noticeCalendarMonthBounds,
  type NoticeCalendarWindow,
} from "@/lib/content/noticeCalendarWindow";
import { btnClass } from "@/components/ui/kit";
import {
  FIELD,
  FIELD_LABEL,
  HELP,
  INFO_NOTE,
  TABLE_CARD,
  TABLE_HEAD,
  TABLE_HEAD_DESC,
  TABLE_HEAD_TITLE,
  WARN_NOTE,
} from "@/components/admin/adminUi";

export function NoticeCalendarWindowForm({
  initial,
  /** 서버에서 만든 "이번 달"(한국 시각 `YYYY-MM`). 클라이언트에서 만들면 서버 렌더와 갈린다 */
  nowMonth,
}: {
  initial: NoticeCalendarWindow;
  nowMonth: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const patch = (next: Partial<NoticeCalendarWindow>) => {
    setValue((v) => ({ ...v, ...next }));
    setMessage(null);
    setError(null);
  };

  // 저장된 값이 아니라 지금 입력 중인 값으로 판정한다 — 저장을 누르기 전에 결과를 본다.
  const invalidRange = !!(
    value.enabled &&
    value.startMonth &&
    value.endMonth &&
    value.startMonth > value.endMonth
  );
  const bounds = noticeCalendarMonthBounds(value);
  const opensAt = formatMonth(initialCalendarMonth(value, nowMonth));

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/notice-calendar-window", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "저장하지 못했습니다.");
        return;
      }
      setValue(data.window);
      setMessage("저장했습니다.");
      router.refresh();
    } catch {
      setError("저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={`mt-10 ${TABLE_CARD}`}>
      <div className={TABLE_HEAD}>
        <div>
          <p className={TABLE_HEAD_TITLE}>공지 캘린더 노출 월</p>
          <p className={TABLE_HEAD_DESC}>
            공지사항에 넣은 「대관 현황 캘린더」가 보여 줄 달의 범위입니다. 이번 회차에
            신청받는 달만 넘겨 볼 수 있게 하고, 범위 밖의 달로는 넘어가지 않습니다.
          </p>
        </div>
      </div>

      <div className="space-y-5 px-4 py-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
            className="mt-0.5"
          />
          <span>
            <span className="text-s font-bold">노출 월 제한 사용</span>
            <span className={`mt-0.5 block ${HELP}`}>
              끄면 제한 없이 어느 달이든 넘겨 볼 수 있습니다(지금까지의 동작).
            </span>
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={FIELD_LABEL} htmlFor="calendar-window-start">
              시작 달
            </label>
            <input
              id="calendar-window-start"
              type="month"
              value={value.startMonth ?? ""}
              disabled={!value.enabled}
              onChange={(e) => patch({ startMonth: e.target.value || null })}
              className={FIELD}
            />
            <p className={`mt-1 ${HELP}`}>비우면 앞쪽 제한 없음</p>
          </div>
          <div>
            <label className={FIELD_LABEL} htmlFor="calendar-window-end">
              종료 달
            </label>
            <input
              id="calendar-window-end"
              type="month"
              value={value.endMonth ?? ""}
              disabled={!value.enabled}
              onChange={(e) => patch({ endMonth: e.target.value || null })}
              className={FIELD}
            />
            <p className={`mt-1 ${HELP}`}>비우면 뒤쪽 제한 없음 · 이 달까지 보입니다</p>
          </div>
        </div>

        {/* 지금 이 설정으로 이용자에게 무엇이 보이는지. 달을 넣어 두고 왜 그 달이
            안 보이는지 묻는 일이 없도록, 저장 전에 결과를 문장으로 알려 준다. */}
        {invalidRange ? (
          <p className={WARN_NOTE}>
            시작 달이 종료 달보다 뒤입니다 — 이대로면 볼 수 있는 달이 없습니다.
          </p>
        ) : (
          <p className={INFO_NOTE}>
            캘린더는 <strong>{opensAt}</strong> 부터 열립니다.
            {bounds.start || bounds.end
              ? ` 넘겨 볼 수 있는 범위는 ${formatMonth(bounds.start) ?? "제한 없음"} ~ ${formatMonth(bounds.end) ?? "제한 없음"} 입니다.`
              : " 넘겨 볼 수 있는 달에 제한이 없습니다."}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || invalidRange}
            className={btnClass("primary", "md")}
          >
            {saving ? "저장 중..." : "저장"}
          </button>
          {message && <span className="text-xs text-ok">{message}</span>}
          {error && <span className="text-xs text-danger">{error}</span>}
        </div>
      </div>
    </section>
  );
}
