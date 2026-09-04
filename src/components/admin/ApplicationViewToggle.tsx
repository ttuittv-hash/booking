"use client";

/*
  신청 내역 — 레이어로 볼지 페이지로 볼지 (2026-09-02).

  둘 다 쓸모가 있다. 심사하다 곁눈질로 확인할 때는 레이어가 빠르고(화면을 떠나지 않는다),
  첨부를 새 탭으로 열거나 주소를 담당자끼리 주고받을 때는 페이지가 낫다. 그래서 고르게
  둔다 — 고른 방식은 다음에 열 때 그대로 쓴다.

  레이어는 같은 화면(`/admin/{id}/application?embed=1`)을 그대로 띄운다. 내용을 두 벌로
  만들면 한쪽만 고쳐지는 일이 반드시 생긴다.
*/

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";

const PREF_KEY = "arena.applicationView";
type ViewMode = "layer" | "page";

const BTN =
  "inline-flex items-center rounded-full border px-5 py-2 text-xs font-bold transition-colors";
const PRIMARY = `${BTN} border-foreground bg-foreground text-background hover:bg-transparent hover:text-foreground`;
const SECONDARY = `${BTN} border-border-soft text-muted hover:border-foreground hover:text-foreground`;

function readPref(): ViewMode {
  try {
    const saved = window.localStorage.getItem(PREF_KEY);
    return saved === "layer" ? "layer" : "page";
  } catch {
    // 저장소를 막아 둔 브라우저 — 기본값(페이지)으로 둔다
    return "page";
  }
}

/** 다른 탭에서 바꾼 선택도 따라간다(같은 운영자가 창을 여러 개 열어 둔다). */
function subscribePref(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export function ApplicationViewToggle({ quoteId }: { quoteId: string }) {
  const href = `/admin/${quoteId}/application`;
  /*
    저장된 선택은 브라우저에만 둔다 — 운영자 개인의 보기 습관이라 서버에 남길 것이 없다.
    서버 렌더에는 저장소가 없으므로 기본값(페이지)으로 그리고, 브라우저에서 읽은 값으로
    맞춘다. useSyncExternalStore 를 쓰면 그 맞춤이 렌더 중에 끝나 깜빡임이 없다.
  */
  const stored = useSyncExternalStore(subscribePref, readPref, () => "page" as ViewMode);
  const [picked, setPicked] = useState<ViewMode | null>(null);
  const mode = picked ?? stored;
  const [open, setOpen] = useState(false);

  function remember(next: ViewMode) {
    setPicked(next);
    try {
      window.localStorage.setItem(PREF_KEY, next);
    } catch {
      /* 못 저장해도 이번 클릭은 그대로 동작한다 */
    }
  }

  // 레이어가 열려 있는 동안 뒤 화면이 같이 스크롤되면 어디를 보고 있는지 놓친다.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {mode === "layer" ? (
          <>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={PRIMARY}
              data-testid="application-open-layer"
            >
              신청 내역 보기
            </button>
            <Link href={href} onClick={() => remember("page")} className={SECONDARY}>
              페이지로 열기
            </Link>
          </>
        ) : (
          <>
            <Link
              href={href}
              onClick={() => remember("page")}
              className={PRIMARY}
              data-testid="application-open-page"
            >
              신청 내역 보기
            </Link>
            <button
              type="button"
              onClick={() => {
                remember("layer");
                setOpen(true);
              }}
              className={SECONDARY}
            >
              레이어로 열기
            </button>
          </>
        )}
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="신청 내역"
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-surface border border-border bg-background"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border-soft px-5 py-3">
              <h2 className="type-kr-heading text-h6-m">신청 내역</h2>
              <span className="flex items-center gap-3">
                <Link
                  href={href}
                  onClick={() => remember("page")}
                  className="text-xs text-muted hover:text-foreground"
                >
                  페이지로 열기 ↗
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="닫기"
                  className="text-xs text-muted hover:text-foreground"
                >
                  닫기 ✕
                </button>
              </span>
            </div>
            {/* 같은 화면을 그대로 띄운다 — 내용을 두 벌로 만들지 않기 위해서다. */}
            <iframe
              src={`${href}?embed=1`}
              title="신청 내역"
              className="h-[80vh] w-full border-0 bg-background"
            />
          </div>
        </div>
      )}
    </>
  );
}
