"use client";

import { useState, type ReactNode } from "react";
import { btnClass } from "@/components/ui/kit";
import { NoticeEditor } from "./NoticeEditor";
import { ADD_BTN, CARD, ERROR_NOTE, FIELD, FIELD_LABEL, HELP, OK_NOTE, REMOVE_BTN, SUB_TITLE } from "./adminUi";

/** 파일 선택 input — 샤프 코너 · border-soft */
const FILE_INPUT =
  "text-xs text-muted file:mr-3 file:border file:border-border-soft file:bg-panel file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-foreground";

/* ============================================================================
   페이지 콘텐츠 편집기의 공용 조각.

   화면마다 폼을 새로 짜지 않도록 입력 한 칸 · 목록 하나를 여기서 정의하고,
   페이지별 폼은 이것들을 조합만 한다.
   ========================================================================= */

export function Text({
  label,
  value,
  onChange,
  placeholder,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  help?: string;
}) {
  return (
    <label className="block">
      <span className={FIELD_LABEL}>{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={FIELD}
      />
      {help && <span className={`mt-1 block ${HELP}`}>{help}</span>}
    </label>
  );
}

/* ----------------------------------------------------------- 입력 안내 --- */

/**
 * 문단이 나뉘는 칸의 공통 안내. 여러 줄 입력칸과 리치텍스트 편집기가 **같은 문구**를 쓴다 —
 * 두 방식은 운영자에게 같은 기능이므로 안내가 달라지면 다른 기능처럼 읽힌다.
 */
export const PARAGRAPH_HINT = "Enter 를 누르면 새 문단이 됩니다. 나눈 대로 화면에 나갑니다.";

/** 줄만 바뀌는 칸(제목·디스플레이 카피)의 안내. 문단이 아니라 줄이라는 점만 다르다 */
export const LINE_HINT = "Enter 를 누르면 줄이 바뀝니다. 나눈 대로 화면에 나갑니다.";

export function Area({
  label,
  value,
  onChange,
  rows = 3,
  help,
  paragraph = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  help?: string;
  /** 문단 안내를 붙일지 — 줄 단위로 파싱하는 칸(규약 전문 등)에서는 끈다 */
  paragraph?: boolean;
}) {
  const note = [help, paragraph ? PARAGRAPH_HINT : null].filter(Boolean).join(" ");
  return (
    <label className="block">
      <span className={FIELD_LABEL}>{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={FIELD}
      />
      {note && <span className={`mt-1 block ${HELP}`}>{note}</span>}
    </label>
  );
}

export function Rich({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  help?: string;
}) {
  // 안내 문구는 여러 줄 입력칸과 같다 — 운영자에게는 같은 기능이다.
  const note = [help, PARAGRAPH_HINT].filter(Boolean).join(" ");
  return (
    <div>
      <span className={FIELD_LABEL}>{label}</span>
      <p className={`mb-2 ${HELP}`}>{note}</p>
      <NoticeEditor value={value} onChange={onChange} />
    </div>
  );
}

/**
 * 이미지 한 장 — 파일을 올리거나 주소를 직접 넣는다.
 * 업로드는 `/api/admin/pages/upload` 로 가고 `/api/pages/image/…` 주소를 돌려준다.
 * 리포지터리에 함께 커밋한 기본 사진(`/images/…`)도 그대로 쓸 수 있다.
 */
export function ImageField({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  help?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/pages/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) setError(data.error || "업로드하지 못했습니다.");
      else onChange(data.url);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <span className={FIELD_LABEL}>{label}</span>
      {help && <p className={`mb-2 ${HELP}`}>{help}</p>}
      {value && (
        // 업로드·정적 파일 주소를 그대로 미리보기 한다 — next/image 로 감쌀 이유가 없다
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          className="mb-2 h-32 w-full border border-border-soft object-cover"
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input type="file" accept="image/*" onChange={upload} className={FILE_INPUT} />
        {value && (
          <button type="button" onClick={() => onChange(null)} className={REMOVE_BTN}>
            사진 삭제
          </button>
        )}
      </div>
      {uploading && <p className={`mt-1 ${HELP}`}>업로드 중…</p>}
      {error && <p className={`mt-1 ${ERROR_NOTE}`}>{error}</p>}
      <input
        type="text"
        value={value ?? ""}
        placeholder="/images/… 또는 /api/pages/image/…"
        onChange={(e) => onChange(e.target.value.trim() ? e.target.value : null)}
        className={`${FIELD} mt-2`}
      />
    </div>
  );
}

/** 문자열 목록 — 한 줄짜리 항목이 반복될 때 */
export function StringList({
  label,
  items,
  onChange,
  placeholder,
  addLabel = "+ 항목 추가",
}: {
  label?: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  return (
    <div>
      {label && <span className={FIELD_LABEL}>{label}</span>}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={item}
              placeholder={placeholder}
              onChange={(e) => onChange(items.map((v, j) => (j === i ? e.target.value : v)))}
              className={FIELD}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className={REMOVE_BTN}
            >
              삭제
            </button>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...items, ""])} className={ADD_BTN}>
          {addLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * 객체 목록 — 항목마다 여러 칸이 있을 때. 추가·삭제·순서 이동을 제공한다.
 * `render` 는 항목 하나를 그리는 함수이며, `patch` 로 일부 필드만 바꾼다.
 */
export function ListEditor<T>({
  label,
  help,
  items,
  onChange,
  blank,
  addLabel = "+ 항목 추가",
  render,
  titleOf,
}: {
  label?: string;
  help?: string;
  items: T[];
  onChange: (items: T[]) => void;
  blank: () => T;
  addLabel?: string;
  render: (item: T, patch: (p: Partial<T>) => void, index: number) => ReactNode;
  /** 접힘 상태에서 보여줄 요약. 없으면 순번만 나온다 */
  titleOf?: (item: T, index: number) => string;
}) {
  function patchAt(i: number, p: Partial<T>) {
    onChange(items.map((v, j) => (j === i ? { ...v, ...p } : v)));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div>
      {label && <span className={FIELD_LABEL}>{label}</span>}
      {help && <p className={`mb-2 ${HELP}`}>{help}</p>}
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className={CARD}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-muted">
                {titleOf ? titleOf(item, i) : `${i + 1}`}
              </span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="위로"
                  className={`${REMOVE_BTN} disabled:opacity-30`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                  aria-label="아래로"
                  className={`${REMOVE_BTN} disabled:opacity-30`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                  className={REMOVE_BTN}
                >
                  삭제
                </button>
              </span>
            </div>
            {render(item, (p) => patchAt(i, p), i)}
          </div>
        ))}
        <button type="button" onClick={() => onChange([...items, blank()])} className={ADD_BTN}>
          {addLabel}
        </button>
      </div>
    </div>
  );
}

/** 폼 껍데기 — 제목 · 저장 버튼 · 결과 메시지를 한 규격으로 묶는다 */
export function ContentFormShell<T>({
  page,
  initial,
  children,
}: {
  /** `/api/admin/content/[page]` 의 페이지 키 */
  page: string;
  initial: T;
  children: (value: T, patch: (p: Partial<T>) => void) => ReactNode;
}) {
  const [value, setValue] = useState<T>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function patch(p: Partial<T>) {
    setValue((v) => ({ ...v, ...p }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/content/${page}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setMessage("저장했습니다. 해당 화면에 바로 반영됩니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {children(value, patch)}

      {message && <p className={OK_NOTE}>{message}</p>}
      {error && <p className={ERROR_NOTE}>{error}</p>}

      <div className="sticky bottom-0 -mx-6 border-t border-border/20 bg-background px-6 py-3">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className={btnClass("primary", "md")}
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}

export function Section({ title, help, children }: { title: string; help?: string; children: ReactNode }) {
  return (
    <section className="border-t border-border/15 pt-7 first:border-t-0 first:pt-0">
      <h3 className={SUB_TITLE}>{title}</h3>
      {help && <p className={`mt-2 ${HELP}`}>{help}</p>}
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}
