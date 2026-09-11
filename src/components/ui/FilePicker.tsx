"use client";

import { useRef, useState, type ChangeEvent, type ReactNode, type RefObject } from "react";
import { btnClass, ROW_REMOVE_BTN } from "@/components/ui/kit";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * 파일 첨부 — 사이트의 모든 첨부 자리가 쓰는 한 가지 모양.
 *
 *   ┌──────────────────────────────────────────────┐
 *   │ 무엇을 올리는 자리인지 *          [파일 선택] │
 *   │ 고른 파일 이름 (없으면 회색 안내)             │
 *   └──────────────────────────────────────────────┘
 *
 * 왼쪽 위가 **이름표**(무엇을 올리는 자리인지), 그 아래가 **현재 상태**(고른 파일 또는
 * 「선택한 파일이 없습니다」), 오른쪽 끝이 **행동**(파일 선택)이다. 여러 장 받는 자리는
 * 이름이 아래로 쌓인다.
 *
 * 브라우저가 그리는 파일 입력을 그대로 쓰면 버튼 글자(`Choose Files`)와 빈 상태 글자
 * (`No file chosen`)를 우리가 정할 수 없다. 화면 전체가 한국어인데 그 자리만 영문으로
 * 남고 버튼 모양도 시스템 것이라, 진짜 입력칸은 숨기고 직접 그린다.
 *
 * 모서리는 샤프다 — 예전 구현은 `rounded-surface` 였지만 이 지면의 코너는 0 이다(§0).
 */
export function FilePicker({
  label,
  required = false,
  onChange,
  inputRef,
  multiple = false,
  accept,
  disabled = false,
  /**
   * 이름표 아래에 늘어놓을 파일들. 부모가 목록을 들고 있는 자리(여러 장 첨부)에서 넘긴다.
   * 넘기지 않으면 입력칸이 실제로 들고 있는 파일을 그대로 보여 준다 — 부모가 값을
   * 비우는(`e.target.value = ""`) 자리에서는 곧바로 빈 상태로 돌아간다.
   */
  files,
  /** 넘기면 파일마다 지우기(✕)가 붙는다. */
  onRemove,
  buttonLabel = "파일 선택",
  emptyLabel = "선택한 파일이 없습니다.",
  testId,
  className = "",
}: {
  /** 무엇을 올리는 자리인지. 넘기면 테두리 있는 한 줄 카드로 그린다. */
  label?: ReactNode;
  required?: boolean;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  multiple?: boolean;
  accept?: string;
  disabled?: boolean;
  files?: { name: string; size?: number }[];
  onRemove?: (index: number) => void;
  buttonLabel?: string;
  emptyLabel?: string;
  testId?: string;
  className?: string;
}) {
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;
  const [ownFiles, setOwnFiles] = useState<{ name: string; size?: number }[]>([]);

  const rows = files ?? ownFiles;

  const input = (
    <input
      ref={ref}
      type="file"
      data-testid={testId}
      multiple={multiple}
      accept={accept}
      disabled={disabled}
      onChange={(e) => {
        onChange?.(e);
        // 부모가 방금 입력칸을 비웠을 수 있다(목록을 직접 들고 있는 자리). 처리 뒤의
        // 실제 값을 다시 읽어야 화면에 없는 파일 이름이 남지 않는다.
        const picked = (e.target as HTMLInputElement).files;
        setOwnFiles(picked ? Array.from(picked).map((f) => ({ name: f.name, size: f.size })) : []);
      }}
      className="hidden"
    />
  );

  const button = (
    <button
      type="button"
      disabled={disabled}
      onClick={() => ref.current?.click()}
      className={`${btnClass("primary", "sm")} shrink-0 whitespace-nowrap`}
    >
      {buttonLabel}
    </button>
  );

  const fileList =
    rows.length > 0 ? (
      <ul className="space-y-1">
        {rows.map((f, i) => (
          <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-s">
            <span className="min-w-0 break-all text-foreground">{f.name}</span>
            {f.size != null && (
              <span className="shrink-0 text-xs text-muted tabular-nums">{formatSize(f.size)}</span>
            )}
            {onRemove && (
              <button type="button" aria-label="삭제" onClick={() => onRemove(i)} className={ROW_REMOVE_BTN}>
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
    ) : null;

  const emptyText =
    rows.length === 0 && emptyLabel ? (
      <span className="break-all text-s text-muted">{emptyLabel}</span>
    ) : null;

  /*
    이름표가 없는 자리(바로 위에 제목이 이미 서 있는 경우) — **지면 폭을 다 쓰는 흰
    컨테이너** 하나다. 테두리는 두지 않는다(면 색이 경계를 만든다).

    고른 파일은 **컨테이너 안 위쪽에 쌓이고**, 버튼과 상태 문구가 그 아래에 남는다.
    파일을 헤어라인으로 갈라 아래로 늘어놓던 동안 목록이 표처럼 읽혔고, 새로 고른
    파일이 버튼에서 멀어져 방금 무엇이 추가됐는지 눈으로 잇기 어려웠다.
  */
  if (label === undefined) {
    return (
      <div className={`w-full bg-panel p-4 ${className}`}>
        {input}
        {fileList && <div className="mb-3">{fileList}</div>}
        <div className="flex flex-wrap items-center gap-3">
          {button}
          {emptyText}
        </div>
      </div>
    );
  }

  const status = fileList ?? (emptyText && <p className="mt-0.5">{emptyText}</p>);

  return (
    <div className={`flex items-start justify-between gap-4 border border-border-soft px-5 py-4 ${className}`}>
      {input}
      <div className="min-w-0">
        <span className="break-keep text-s font-bold text-foreground">
          {label}
          {required && <span className="text-danger"> *</span>}
        </span>
        {status}
      </div>
      {button}
    </div>
  );
}
