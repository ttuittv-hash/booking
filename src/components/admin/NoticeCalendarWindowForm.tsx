"use client";

/*
  공지 캘린더 공개 기간 (2026-09-02).

  공지사항 본문에 넣는 「대관 현황 캘린더」는 지금까지 공지가 살아 있는 한 계속 열려
  있었다. 대관 접수는 회차로 돌기 때문에 접수 기간이 아닐 때는 캘린더 대신 안내 문구가
  나가야 한다. 그 기간을 여기서 정한다.

  시각은 한국 시각으로 그대로 저장한다(`datetime-local` 값 = 저장값). 운영자가 한국
  시각으로 넣고 이용자도 한국 시각으로 보므로, 중간에 UTC 로 바꿔 담으면 배포 환경의
  서버 TZ 에 따라 한 시간씩 밀리기만 한다.
*/

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatWindowMoment,
  noticeCalendarWindowState,
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
  /** 서버에서 만든 "지금"(한국 시각). 클라이언트에서 만들면 서버 렌더 결과와 갈린다 */
  nowLocal,
}: {
  initial: NoticeCalendarWindow;
  nowLocal: string;
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
  const state = noticeCalendarWindowState(value, nowLocal);
  const invalidRange = !!(value.enabled && value.startAt && value.endAt && value.startAt > value.endAt);

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
          <p className={TABLE_HEAD_TITLE}>공지 캘린더 공개 기간</p>
          <p className={TABLE_HEAD_DESC}>
            공지사항에 넣은 「대관 현황 캘린더」가 화면에 보이는 기간입니다. 기간 밖에는
            캘린더 대신 아래 안내 문구가 나갑니다.
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
            <span className="text-s font-bold">공개 기간 사용</span>
            <span className={`mt-0.5 block ${HELP}`}>
              끄면 기간 제한 없이 항상 보입니다(지금까지의 동작).
            </span>
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={FIELD_LABEL} htmlFor="calendar-window-start">
              공개 시작 (한국 시각)
            </label>
            <input
              id="calendar-window-start"
              type="datetime-local"
              value={value.startAt ?? ""}
              disabled={!value.enabled}
              onChange={(e) => patch({ startAt: e.target.value || null })}
              className={FIELD}
            />
            <p className={`mt-1 ${HELP}`}>비우면 시작 제한 없음</p>
          </div>
          <div>
            <label className={FIELD_LABEL} htmlFor="calendar-window-end">
              공개 종료 (한국 시각)
            </label>
            <input
              id="calendar-window-end"
              type="datetime-local"
              value={value.endAt ?? ""}
              disabled={!value.enabled}
              onChange={(e) => patch({ endAt: e.target.value || null })}
              className={FIELD}
            />
            <p className={`mt-1 ${HELP}`}>비우면 종료 제한 없음 · 입력한 분까지 열립니다</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={FIELD_LABEL} htmlFor="calendar-window-before">
              시작 전 안내 문구
            </label>
            <input
              id="calendar-window-before"
              type="text"
              value={value.beforeMessage}
              disabled={!value.enabled}
              onChange={(e) => patch({ beforeMessage: e.target.value })}
              className={FIELD}
            />
          </div>
          <div>
            <label className={FIELD_LABEL} htmlFor="calendar-window-after">
              종료 후 안내 문구
            </label>
            <input
              id="calendar-window-after"
              type="text"
              value={value.afterMessage}
              disabled={!value.enabled}
              onChange={(e) => patch({ afterMessage: e.target.value })}
              className={FIELD}
            />
          </div>
        </div>

        {/* 지금 이 설정으로 이용자에게 무엇이 보이는지. 기간을 넣어 두고 왜 안 보이는지
            묻는 일이 없도록, 저장 전에 결과를 문장으로 알려 준다. */}
        {invalidRange ? (
          <p className={WARN_NOTE}>
            공개 시작이 종료보다 늦습니다 — 이대로면 캘린더가 열리지 않습니다.
          </p>
        ) : (
          <p className={INFO_NOTE}>
            {state === "OPEN"
              ? "지금은 이용자에게 캘린더가 보입니다."
              : state === "BEFORE"
                ? `지금은 캘린더 대신 안내 문구가 나갑니다. ${formatWindowMoment(value.startAt) ?? "설정한 시각"}부터 열립니다.`
                : `지금은 캘린더 대신 안내 문구가 나갑니다. ${formatWindowMoment(value.endAt) ?? "설정한 시각"}에 마감되었습니다.`}
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
