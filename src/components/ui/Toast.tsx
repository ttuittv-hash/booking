"use client";

// 토스트 — 입력 오류·안내를 화면 위에 잠깐 띄운다.
//
// 예전에는 위저드 상단에 오류 문단을 붙였는데, 스크롤을 내려 입력하다 [다음]을 누르면
// 메시지가 화면 밖에 떠서 왜 안 넘어가는지 알 수 없었다. 토스트는 보고 있는 자리에 뜬다.
//
// 화면 아래에서 올라온다(2026-08-21 확정). 위로 옮겨 봤지만 사용자가 아래를 선호했다.
// 아래에 둘 때의 진짜 문제는 위치가 아니라 **반투명 배경**이었다 — bg-danger/10 은
// 뒤 콘텐츠가 비쳐서 글자가 묻혔다. 배경은 불투명하게 깔고 색은 테두리·글자로 낸다.
//
// 접근성: role="status" + aria-live="polite" 로 스크린리더가 읽는다.
// 오류는 assertive 로 즉시 읽게 한다.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type ToastTone = "error" | "info" | "success";
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  show: (message: string, tone?: ToastTone) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  success: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** 토스트가 없는 곳에서도 호출부가 깨지지 않게 기본값을 준다. */
const NOOP: ToastApi = {
  show: () => {},
  error: () => {},
  info: () => {},
  success: () => {},
};

export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NOOP;
}

// 배경은 불투명한 바탕색 — 반투명이면 뒤 콘텐츠가 비쳐 글자가 묻힌다.
const TONE_CLASS: Record<ToastTone, string> = {
  error: "border-danger bg-background text-danger",
  info: "border-foreground bg-background text-foreground",
  success: "border-ok bg-background text-ok",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, tone: ToastTone = "error") => {
    // 같은 메시지가 연달아 뜨면 하나로 본다 — 버튼을 두 번 누르면 두 개가 쌓인다.
    setItems((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].message === message) return prev;
      return [...prev, { id: Date.now() + Math.random(), tone, message }];
    });
  }, []);

  // 매 렌더 새 객체를 만들면 이걸 의존성으로 쓰는 effect 가 계속 다시 돈다.
  const api = useMemo<ToastApi>(
    () => ({
      show,
      error: (m: string) => show(m, "error"),
      info: (m: string) => show(m, "info"),
      success: (m: string) => show(m, "success"),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[200] flex flex-col items-center gap-2 px-4 sm:bottom-8"
        aria-live="polite"
      >
        {items.map((t) => (
          <Toast key={t.id} item={t} onDone={() => setItems((prev) => prev.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 4000);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      data-testid="toast"
      data-tone={item.tone}
      role={item.tone === "error" ? "alert" : "status"}
      className={`pointer-events-auto flex w-full max-w-md items-start gap-3 border-2 px-4 py-3 shadow-xl animate-[toast-in_180ms_ease-out] ${TONE_CLASS[item.tone]}`}
    >
      <span className="mt-0.5 shrink-0 text-xs font-bold" aria-hidden>
        {item.tone === "error" ? "!" : item.tone === "success" ? "✓" : "i"}
      </span>
      <span className="min-w-0 flex-1 break-keep text-s leading-6">{item.message}</span>
      <button
        type="button"
        onClick={onDone}
        aria-label="닫기"
        className="shrink-0 text-xs opacity-60 transition-opacity hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
