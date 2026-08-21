"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/* ============================================================================
   Figma `2607 서울아레나 웹사이트 Full › Wireframe › Content / 1`

     좌 2컬럼 : 스티키 검색창 + 목차(Table of contents) — 현재 위치를 굵게
     우 4컬럼 : 본문 — 장(H5) · 조(H6) · 항(본문) 순서
     좁은 화면에서는 목차가 본문 위로 올라간다.

   조문처럼 긴 규범 문서를 읽는 화면의 표준이다.

   검색은 **본문을 지우지 않는다.** 걸리지 않은 조를 걷어내면 문서 높이가 타이핑 도중
   계속 줄어들고, 브라우저가 스크롤 위치를 새 바닥으로 밀어 화면이 갑자기 아래로 튄다.
   그래서 문서는 그대로 두고 걸린 곳만 표시하고, 브라우저 찾기처럼
   `n/N` + 이전·다음으로 옮겨 다닌다. 목차도 바뀌지 않고 걸린 장에 개수만 붙는다.
   ========================================================================= */

export interface ArticleItem {
  title: string;
  paragraphs: string[];
}

export interface ArticleSection {
  id: string;
  /** 목차와 본문에 함께 쓰는 제목 */
  title: string;
  /** 검색이 필요 없는 문서 — 본문을 그대로 넘긴다 */
  body?: ReactNode;
  /** 검색 가능한 문서 — 조 단위로 넘긴다 */
  articles?: ArticleItem[];
}

/** 스크롤·앵커 판정선 — 상단바 아래 첫 줄 (본문 `scroll-mt` 와 같은 값) */
function anchorLine(): number {
  const headerH =
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 64;
  return headerH + 96;
}

/**
 * 검색어에 걸린 부분을 표시한다.
 * 각 표시에 문서 순서대로 매겨진 id 를 달아 이전·다음 이동의 목표로 쓴다.
 */
function Highlight({
  text,
  query,
  idPrefix,
  activeId,
}: {
  text: string;
  query: string;
  idPrefix?: string;
  activeId?: string | null;
}) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const out: ReactNode[] = [];
  let from = 0;
  let n = 0;
  for (;;) {
    const at = lower.indexOf(q, from);
    if (at < 0) break;
    if (at > from) out.push(text.slice(from, at));
    const id = idPrefix ? `${idPrefix}-${n}` : undefined;
    const isActive = !!id && id === activeId;
    out.push(
      <mark
        key={at}
        id={id}
        className={
          isActive
            ? "scroll-mt-[calc(var(--header-h)+6rem)] bg-accent text-on-accent"
            : "scroll-mt-[calc(var(--header-h)+6rem)] bg-accent/30 text-foreground"
        }
      >
        {text.slice(at, at + q.length)}
      </mark>,
    );
    from = at + q.length;
    n += 1;
  }
  out.push(text.slice(from));
  return <>{out}</>;
}

/** 표시 하나하나의 id — 문서 순서대로 매긴다. Highlight 의 규칙과 같아야 한다. */
function countIn(text: string, needle: string): number {
  if (!needle) return 0;
  const lower = text.toLowerCase();
  let from = 0;
  let n = 0;
  for (;;) {
    const at = lower.indexOf(needle, from);
    if (at < 0) break;
    n += 1;
    from = at + needle.length;
  }
  return n;
}

interface MatchIndex {
  /** 문서 순서대로 나열한 표시 id */
  ids: string[];
  /** 장별 걸린 개수 */
  perSection: Record<string, number>;
}

function buildMatchIndex(sections: ArticleSection[], q: string): MatchIndex {
  const ids: string[] = [];
  const perSection: Record<string, number> = {};
  if (!q) return { ids, perSection };
  const needle = q.toLowerCase();
  sections.forEach((s, si) => {
    let count = 0;
    (s.articles ?? []).forEach((a, ai) => {
      const fields: [string, string][] = [
        ["t", a.title],
        ...a.paragraphs.map((p, pi) => [`p${pi}`, p] as [string, string]),
      ];
      fields.forEach(([key, text]) => {
        const n = countIn(text, needle);
        for (let i = 0; i < n; i++) ids.push(`m-${si}-${ai}-${key}-${i}`);
        count += n;
      });
    });
    if (count > 0) perSection[s.id] = count;
  });
  return { ids, perSection };
}

function SearchIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-4 w-4"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" strokeLinecap="square" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-4 w-4"
    >
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="square" />
    </svg>
  );
}

/** 검색 이동 버튼 — 샤프 코너 · 아웃라인, 최소 터치 40 */
const STEP_BTN =
  "flex h-10 w-10 items-center justify-center border border-border/25 text-foreground transition-colors hover:border-foreground disabled:cursor-not-allowed disabled:opacity-30";

export function ArticleLayout({
  sections,
  searchLabel,
  searchPlaceholder = "검색어를 입력하세요",
}: {
  sections: ArticleSection[];
  /** 값을 넘기면 목차 위에 검색창이 붙는다. `articles` 를 준 섹션만 검색된다. */
  searchLabel?: string;
  searchPlaceholder?: string;
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const [input, setInput] = useState("");
  /** 타이핑이 멈춘 뒤의 검색어 — 글자마다 다시 그리고 스크롤하지 않는다 */
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 입력을 잠깐 모아서 반영한다. 한 글자마다 본문을 다시 그리고 화면을 옮기면
  // 조합 중인 한글이 끊기고 스크롤이 요동친다.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(input.trim());
      setCursor(0);
    }, 220);
    return () => clearTimeout(t);
  }, [input]);

  const { ids: matchIds, perSection } = useMemo(
    () => buildMatchIndex(sections, query),
    [sections, query],
  );
  const total = matchIds.length;
  const activeMatchId = total > 0 ? matchIds[Math.min(cursor, total - 1)] : null;

  const goTo = useCallback((id: string | null) => {
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - anchorLine();
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, []);

  // 검색어가 바뀌면 첫 번째 표시로 옮긴다. 표시가 DOM 에 붙은 뒤라야 좌표가 나온다.
  useEffect(() => {
    if (matchIds.length === 0) return;
    const t = setTimeout(() => goTo(matchIds[0]), 0);
    return () => clearTimeout(t);
  }, [matchIds, goTo]);

  function step(delta: number) {
    if (total === 0) return;
    const next = (cursor + delta + total) % total;
    setCursor(next);
    goTo(matchIds[next]);
  }

  function clear() {
    setInput("");
    setQuery("");
    setCursor(0);
    inputRef.current?.focus();
  }

  /*
    현재 위치는 스크롤 좌표에서 직접 계산한다.

    IntersectionObserver 로 하면 두 가지가 어긋난다 — 콜백이 **바뀐 항목만** 넘겨주므로
    "지금 보이는 것 중 맨 위"를 부분 집합에서 고르게 되고, rootMargin 과 앵커의
    scroll-margin 이 다르면 목차를 눌러 이동한 직후에도 이전 장이 켜진 채로 남는다.
    판정선을 넘어간 마지막 장이 현재 장이다.
  */
  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      const line = anchorLine();
      let current = sections[0]?.id ?? "";
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - line <= 1) current = s.id;
        else break; // 장은 문서 순서대로 있으므로 하나라도 아래면 그 뒤는 볼 필요가 없다
      }
      setActiveId(current);
    }
    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sections]);

  const searching = query.length > 0;

  return (
    <div className="grid-site">
      {/* 검색 + 목차 */}
      <nav aria-label="목차" className="lg:col-span-2">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+2.5rem)]">
          {searchLabel !== undefined && (
            <div className="mb-6 print:hidden">
              <label htmlFor="article-search" className="text-xs font-bold text-muted">
                {searchLabel}
              </label>
              <div className="relative mt-2">
                {/*
                  `type="search"` 를 쓰지 않는다 — 브라우저가 제 나름의 작은 × 를 그려
                  넣는데 디자인이 어긋나고 누르기도 어렵다. 지우기 버튼을 직접 둔다.
                */}
                <input
                  ref={inputRef}
                  id="article-search"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      step(e.shiftKey ? -1 : 1);
                    }
                    if (e.key === "Escape" && input) {
                      e.preventDefault();
                      clear();
                    }
                  }}
                  placeholder={searchPlaceholder}
                  autoComplete="off"
                  className="field-base w-full pr-10 text-s"
                />
                {input ? (
                  <button
                    type="button"
                    onClick={clear}
                    aria-label="검색어 지우기"
                    className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-muted transition-colors hover:text-foreground"
                  >
                    <ClearIcon />
                  </button>
                ) : (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-muted"
                  >
                    <SearchIcon />
                  </span>
                )}
              </div>

              {searching && (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs tabular-nums text-muted" aria-live="polite">
                    {total > 0 ? `${Math.min(cursor, total - 1) + 1} / ${total}` : "0 / 0"}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => step(-1)}
                      disabled={total === 0}
                      aria-label="이전 검색 결과"
                      className={STEP_BTN}
                    >
                      <svg
                        aria-hidden
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        className="h-3.5 w-3.5"
                      >
                        <path d="M10 3 5 8l5 5" strokeLinecap="square" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => step(1)}
                      disabled={total === 0}
                      aria-label="다음 검색 결과"
                      className={STEP_BTN}
                    >
                      <svg
                        aria-hidden
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        className="h-3.5 w-3.5"
                      >
                        <path d="M6 3l5 5-5 5" strokeLinecap="square" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="type-display text-xs tracking-[0.08em] text-muted">TABLE OF CONTENTS</p>
          <ul className="mt-4 max-h-[50vh] overflow-y-auto border-t border-border/25 print:max-h-none print:overflow-visible">
            {sections.map((s) => {
              const hits = perSection[s.id] ?? 0;
              return (
                <li key={s.id} className="border-b border-border/15">
                  <a
                    href={`#${s.id}`}
                    onClick={() => setActiveId(s.id)}
                    aria-current={activeId === s.id ? "true" : undefined}
                    className={`flex items-center justify-between gap-2 break-keep py-3 text-s transition-colors hover:text-foreground ${
                      activeId === s.id ? "font-bold text-foreground" : "text-muted"
                    }`}
                  >
                    <span className="min-w-0">{s.title}</span>
                    {/* 검색 중에는 걸린 장에 개수만 붙인다 — 목차 자체는 바뀌지 않는다 */}
                    {searching && hits > 0 && (
                      <span className="shrink-0 bg-accent px-1.5 text-xs font-bold tabular-nums text-on-accent">
                        {hits}
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* 본문 — 검색 중에도 조를 걷어내지 않는다 */}
      <div className="min-w-0 lg:col-span-4">
        {searching && total === 0 && (
          <p className="mb-8 text-s text-muted">「{query}」 이(가) 들어간 조문이 없습니다.</p>
        )}
        {sections.map((s, si) => (
          <section key={s.id} id={s.id} className="scroll-mt-[calc(var(--header-h)+6rem)] pb-12">
            <h4 className="type-kr-heading text-h5-m sm:text-h5">{s.title}</h4>
            <div className="mt-6 space-y-8">
              {s.articles
                ? s.articles.map((a, ai) => (
                    <Article
                      key={`${a.title}-${ai}`}
                      title={a.title}
                      paragraphs={a.paragraphs}
                      query={query}
                      idPrefix={`m-${si}-${ai}`}
                      activeMatchId={activeMatchId}
                    />
                  ))
                : s.body}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/** 조 — H6 제목 + 항 목록 */
export function Article({
  title,
  paragraphs,
  query = "",
  idPrefix,
  activeMatchId,
}: {
  title: string;
  paragraphs: string[];
  query?: string;
  /** 검색 표시 id 접두사 — `${idPrefix}-t-n` / `${idPrefix}-p{i}-n` */
  idPrefix?: string;
  activeMatchId?: string | null;
}) {
  return (
    <article>
      <h5 className="type-kr-heading break-keep text-h6-m sm:text-h6">
        <Highlight
          text={title}
          query={query}
          idPrefix={idPrefix ? `${idPrefix}-t` : undefined}
          activeId={activeMatchId}
        />
      </h5>
      <div className="mt-4 space-y-3">
        {paragraphs.map((p, i) => (
          <p key={i} className="measure break-keep text-s leading-7 text-muted-strong">
            <Highlight
              text={p}
              query={query}
              idPrefix={idPrefix ? `${idPrefix}-p${i}` : undefined}
              activeId={activeMatchId}
            />
          </p>
        ))}
      </div>
    </article>
  );
}
