"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { btnClass } from "@/components/ui/kit";
import { setUnsaved } from "./unsavedChanges";
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
 * 문단이 나뉘는 칸의 공통 안내. 리드·설명이 들어가는 칸은 전부 이 여러 줄 입력칸을 쓰고
 * 같은 문구를 붙인다 — 칸마다 안내가 다르면 다른 기능처럼 읽힌다.
 */
export const PARAGRAPH_HINT =
  "Enter 로 줄을 바꾸고, 빈 줄을 한 줄 넣으면 새 문단이 됩니다. 나눈 대로 화면에 나갑니다.";

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
  const areaRef = useRef<HTMLTextAreaElement>(null);

  /*
    [신규 2026-09-04] 굵게 버튼.

    이 칸의 글은 화면에서 **굵게** 표기를 알아본다(kit 의 RichText). 그런데 그 규칙이
    안내에 없어 운영자는 굵게 만들 방법이 없다고 여겼다. 고른 글자를 ** 로 감싸 주고,
    이미 감싸져 있으면 벗긴다. 아무것도 고르지 않았으면 자리만 만들어 커서를 그 안에 둔다.
  */
  function toggleBold() {
    const el = areaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const picked = value.slice(start, end);
    const wrapped = picked.startsWith("**") && picked.endsWith("**") && picked.length > 4;
    const next = wrapped ? picked.slice(2, -2) : `**${picked}**`;
    onChange(value.slice(0, start) + next + value.slice(end));
    // 값이 바뀐 뒤에 커서를 다시 잡아야 한다 — 감싼 글자를 그대로 고른 상태로 둔다.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + (wrapped ? 0 : 2), start + next.length - (wrapped ? 0 : 2));
    });
  }

  return (
    <div className="block">
      <div className="flex items-center justify-between gap-2">
        <span className={FIELD_LABEL}>{label}</span>
        <button
          type="button"
          onClick={toggleBold}
          title="고른 글자를 굵게 만듭니다. 화면에는 굵은 글씨로 나갑니다."
          className="shrink-0 border border-border-soft px-2 py-0.5 text-xs font-bold text-muted hover:text-foreground"
        >
          <b>B</b> 굵게
        </button>
      </div>
      <textarea
        ref={areaRef}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={FIELD}
      />
      {note && <span className={`mt-1 block ${HELP}`}>{note} 굵게 할 부분은 [B 굵게] 버튼을 쓰거나 **굵게** 처럼 감싸면 됩니다.</span>}
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
  help,
}: {
  label?: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  help?: string;
}) {
  return (
    <div>
      {label && <span className={FIELD_LABEL}>{label}</span>}
      {help && <p className={`mb-2 ${HELP}`}>{help}</p>}
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
  const router = useRouter();
  const [value, setValue] = useState<T>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /*
    [신규 2026-09-03] 저장하지 않은 편집을 지킨다.

    탭을 바꾸면 이 폼은 통째로 사라지고 편집 내용도 함께 사라진다. 특히 파일 업로드는
    고르는 즉시 서버로 올라가 화면에 새 파일 이름까지 뜨므로, 저장을 누르지 않고 탭을
    옮겨도 다 된 줄로 보인다 — 실제로는 주소가 저장되지 않아 공개 화면이 계속 옛 파일을
    내려줬다. 마지막으로 저장한 모습과 지금 모습을 견줘 «저장 안 됨»을 알린다.
  */
  const formId = useId();
  // 마지막으로 저장한 모습. 렌더 중에도 견줘야 하므로 state 로 둔다(ref 는 렌더 중 읽을 수 없다).
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initial));
  const dirty = JSON.stringify(value) !== savedSnapshot;

  useEffect(() => {
    setUnsaved(formId, dirty);
    return () => setUnsaved(formId, false);
  }, [formId, dirty]);

  // 새로고침·창 닫기도 같은 사고다 — 브라우저 기본 경고를 띄운다.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function patch(p: Partial<T>) {
    setValue((v) => ({ ...v, ...p }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    // 저장 요청을 보낸 그 순간의 값을 기준으로 삼는다 — 응답을 기다리는 사이에
    // 운영자가 더 고쳤다면 그건 아직 저장되지 않은 편집이 맞다.
    const sending = JSON.stringify(value);
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
      setSavedSnapshot(sending);
      setMessage("저장했습니다. 해당 화면에 바로 반영됩니다.");
      // 서버가 들고 있는 값(이 화면을 다시 그릴 때 쓰는 초기값)도 새로 읽어 온다.
      // 이걸 빼먹으면 탭을 옮겼다 오는 순간 방금 저장한 내용이 옛 값으로 되돌아 보인다.
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {children(value, patch)}

      {message && <p className={OK_NOTE}>{message}</p>}
      {error && <p className={ERROR_NOTE}>{error}</p>}

      <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center gap-3 border-t border-border/20 bg-background px-6 py-3">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className={btnClass("primary", "md")}
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        {dirty && (
          <span className="text-xs font-bold text-danger">
            저장하지 않은 변경이 있습니다 — 저장을 눌러야 공개 화면에 반영됩니다.
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * 내려받기용 문서 한 칸 (2026-09-02).
 *
 * 파일을 고르면 곧바로 올리고 주소·원본 파일명을 돌려준다. 예전에는 운영자가 파일
 * 주소를 직접 타이핑해야 했고(대관 자료 목록의 href), 오타 하나로 링크가 죽었다.
 * 저장은 폼 전체 저장 때 함께 일어난다 — 여기서는 값만 바꿔 둔다.
 */
export function DocumentField({
  label,
  help,
  url,
  name,
  onChange,
}: {
  label: string;
  help?: string;
  url: string;
  name: string;
  onChange: (next: { url: string; name: string }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /*
    [신규 2026-09-03] 방금 올린 파일은 «아직 저장 전»이라고 못박는다.

    파일을 고르면 그 자리에서 서버로 올라가고 화면에도 새 이름이 뜬다 — 그래서 저장을
    누르지 않고 넘어가도 다 된 것처럼 보였다. 실제로는 주소가 콘텐츠에 저장되지 않아
    공개 화면은 계속 옛 파일을 내려줬다(실제 신고된 증상).
  */
  const [justUploaded, setJustUploaded] = useState(false);

  async function upload(file: File) {
    setError(null);
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/content/document-upload", { method: "POST", body });
      const data = await res.json().catch(() => null);
      // 파일이 크면 앞단(프록시·인그레스)이 본문을 잘라 우리 라우트까지 오지도 않는다 —
      // 그때는 JSON 이 아니라 413 이 온다. 상태 코드를 그대로 알려 줘야 원인을 찾는다.
      if (!res.ok) {
        throw new Error(
          data?.error ||
            (res.status === 413
              ? "파일이 너무 커서 서버가 받지 못했습니다. 용량을 줄여 다시 올려 주세요."
              : `올리지 못했습니다. (오류 ${res.status})`),
        );
      }
      onChange({ url: data.url, name: data.name });
      setJustUploaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "올리지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className={FIELD_LABEL}>{label}</span>
      {help && <p className={`mb-2 ${HELP}`}>{help}</p>}
      {url ? (
        <div className="mb-2 flex flex-wrap items-center gap-3 border border-border-soft bg-panel px-3 py-2">
          <a href={url} className="min-w-0 truncate text-s font-bold underline underline-offset-4">
            {name || "첨부파일"}
          </a>
          <button
            type="button"
            onClick={() => {
              setJustUploaded(false);
              onChange({ url: "", name: "" });
            }}
            className={REMOVE_BTN}
          >
            제거
          </button>
        </div>
      ) : (
        <p className={`mb-2 ${HELP}`}>올려 둔 파일이 없습니다. 화면에 내려받기 버튼이 나오지 않습니다.</p>
      )}
      {justUploaded && (
        <p className="mb-2 text-xs font-bold text-danger">
          올렸습니다. 아래 [저장]을 눌러야 공개 화면의 파일이 바뀝니다.
        </p>
      )}
      <input
        type="file"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
        className={FILE_INPUT}
      />
      {busy && <p className={`mt-2 ${HELP}`}>올리는 중…</p>}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
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
