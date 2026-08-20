"use client";

// 토스트 — 입력 오류·안내를 화면 위에 잠깐 띄운다.
//
// 예전에는 위저드 상단에 오류 문단을 붙였는데, 스크롤을 내려 입력하다 [다음]을 누르면
// 메시지가 화면 밖에 떠서 왜 안 넘어가는지 알 수 없었다. 토스트는 보고 있는 자리에 뜬다.
//
// 화면 위에서 내려온다. 처음에는 아래에 띄웠는데, 하필 그 자리에 본문과 버튼이 있어
// 읽던 문장을 가렸다. 위쪽은 헤더가 차지할 뿐이라 가릴 것이 적다 — 헤더 바로 아래에
// 얹어 헤더 자체도 가리지 않는다.
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

const TONE_CLASS: Record<ToastTone, string> = {
  error: "border-danger bg-danger/10 text-danger",
  info: "border-foreground bg-surface text-foreground",
  success: "border-ok bg-ok/10 text-ok",
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
        // 헤더 높이(모바일 56~64px · 데스크톱 64~72px) 바로 아래에 둔다.
        className="pointer-events-none fixed inset-x-0 top-[4.5rem] z-[100] flex flex-col items-center gap-2 px-4 sm:top-20 lg:top-[5.5rem]"
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
      className={`pointer-events-auto flex w-full max-w-md items-start gap-3 border px-4 py-3 shadow-lg animate-[toast-in_180ms_ease-out] ${TONE_CLASS[item.tone]}`}
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
