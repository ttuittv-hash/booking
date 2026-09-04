"use client";

// 확인·알림·입력 팝업 — window.alert/confirm/prompt 대체(2026-08-28 요청: "모든 alert 은 예쁜 popup 으로").
//
// 브라우저 기본 대화상자는 도메인명이 제목으로 붙고 스타일을 입힐 수 없다. 여기서는 토스트와
// 같은 불투명 바탕·굵은 테두리로 화면 가운데 띄운다. 호출부는 Promise 로 결과를 받는다:
//   const dialog = useDialog();
//   if (!(await dialog.confirm("삭제할까요?"))) return;
//   const reason = await dialog.prompt("반려 사유", { placeholder: "…" });  // 취소면 null
//   await dialog.alert("저장했습니다.");
//
// 접근성: role="dialog" aria-modal, 열리면 첫 버튼/입력에 포커스, Esc = 취소, Enter = 확인.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { btnClass } from "./kit";

type Tone = "info" | "danger";

interface AlertOptions {
  title?: string;
  okLabel?: string;
  tone?: Tone;
}
interface ConfirmOptions extends AlertOptions {
  cancelLabel?: string;
}
interface PromptOptions extends ConfirmOptions {
  placeholder?: string;
  defaultValue?: string;
  /** 입력이 비면 확인을 막는다(기본 true). */
  required?: boolean;
  multiline?: boolean;
}

export interface DialogApi {
  alert: (message: string, options?: AlertOptions) => Promise<void>;
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  /** 취소하면 null, 확인하면 입력값(trim). */
  prompt: (message: string, options?: PromptOptions) => Promise<string | null>;
}

type Pending =
  | { kind: "alert"; message: string; options: AlertOptions; resolve: () => void }
  | { kind: "confirm"; message: string; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: "prompt"; message: string; options: PromptOptions; resolve: (v: string | null) => void };

const DialogContext = createContext<DialogApi | null>(null);

/** 프로바이더 밖(테스트 등)에서는 브라우저 기본 대화상자로 물러난다 — 호출부가 깨지지 않게. */
const FALLBACK: DialogApi = {
  alert: async (m) => { if (typeof window !== "undefined") window.alert(m); },
  confirm: async (m) => (typeof window !== "undefined" ? window.confirm(m) : false),
  prompt: async (m, o) => (typeof window !== "undefined" ? window.prompt(m, o?.defaultValue ?? "") : null),
};

export function useDialog(): DialogApi {
  return useContext(DialogContext) ?? FALLBACK;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Pending[]>([]);
  const current = queue[0] ?? null;

  const enqueue = useCallback((p: Pending) => setQueue((prev) => [...prev, p]), []);
  const api = useMemo<DialogApi>(
    () => ({
      alert: (message, options = {}) => new Promise<void>((resolve) => enqueue({ kind: "alert", message, options, resolve })),
      confirm: (message, options = {}) => new Promise<boolean>((resolve) => enqueue({ kind: "confirm", message, options, resolve })),
      prompt: (message, options = {}) => new Promise<string | null>((resolve) => enqueue({ kind: "prompt", message, options, resolve })),
    }),
    [enqueue],
  );

  function finish(result: boolean | string | null) {
    if (!current) return;
    setQueue((prev) => prev.slice(1));
    if (current.kind === "alert") current.resolve();
    else if (current.kind === "confirm") current.resolve(result === true);
    else current.resolve(typeof result === "string" ? result : null);
  }

  return (
    <DialogContext.Provider value={api}>
      {children}
      {current && <DialogBox key={queue.length} pending={current} onFinish={finish} />}
    </DialogContext.Provider>
  );
}

function DialogBox({ pending, onFinish }: { pending: Pending; onFinish: (r: boolean | string | null) => void }) {
  const [value, setValue] = useState(pending.kind === "prompt" ? (pending.options.defaultValue ?? "") : "");
  const okRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const isPrompt = pending.kind === "prompt";
  const required = isPrompt ? pending.options.required !== false : false;
  const canOk = !isPrompt || !required || value.trim().length > 0;
  const tone: Tone = pending.options.tone ?? (pending.kind === "alert" ? "info" : "danger");

  useEffect(() => {
    (isPrompt ? inputRef.current : okRef.current)?.focus();
  }, [isPrompt]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onFinish(pending.kind === "alert" ? true : pending.kind === "confirm" ? false : null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFinish, pending.kind]);

  function ok() {
    if (!canOk) return;
    onFinish(isPrompt ? value.trim() : true);
  }
  function cancel() {
    onFinish(pending.kind === "confirm" ? false : null);
  }

  const lines = pending.message.split("\n");
  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-foreground/40 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && pending.kind !== "alert") cancel();
      }}
      data-testid="dialog-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        data-testid="dialog"
        className="w-full max-w-md border-2 border-foreground bg-background p-6 shadow-[8px_8px_0_0_var(--color-foreground)] animate-[toast-in_180ms_ease-out]"
      >
        <p id="dialog-title" className="text-m font-bold text-foreground">
          {pending.options.title ?? (pending.kind === "alert" ? "안내" : "확인")}
        </p>
        <div className="mt-3 space-y-1 text-s leading-relaxed text-foreground">
          {lines.map((line, i) => (
            <p key={i} className={line === "" ? "h-2" : ""}>{line}</p>
          ))}
        </div>

        {isPrompt &&
          (pending.options.multiline ? (
            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={pending.options.placeholder}
              rows={3}
              data-testid="dialog-input"
              className="field-base mt-4"
            />
          ) : (
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  ok();
                }
              }}
              placeholder={pending.options.placeholder}
              data-testid="dialog-input"
              className="mt-4 h-11 w-full rounded-btn border border-border bg-background px-3 text-s outline-none focus:border-foreground"
            />
          ))}

        <div className="mt-6 flex justify-end gap-2">
          {pending.kind !== "alert" && (
            <button type="button" onClick={cancel} data-testid="dialog-cancel" className={btnClass("secondary", "md")}>
              {pending.options.cancelLabel ?? "취소"}
            </button>
          )}
          <button
            ref={okRef}
            type="button"
            onClick={ok}
            aria-disabled={!canOk}
            data-testid="dialog-ok"
            className={`${btnClass("primary", "md")} ${!canOk ? "opacity-50" : ""} ${tone === "danger" ? "" : ""}`}
          >
            {pending.options.okLabel ?? "확인"}
          </button>
        </div>
      </div>
    </div>
  );
}
