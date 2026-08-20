"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

/* ============================================================================
   Figma `2607 서울아레나 웹사이트 Full › Wireframe › Content / 1`

     좌 2컬럼 : 스티키 검색창 + 목차(Table of contents) — 현재 위치를 굵게
     우 4컬럼 : 본문 — 장(H4) · 조(H5) · 항(본문) 순서
     좁은 화면에서는 목차가 본문 위로 올라간다.

   조문처럼 긴 규범 문서를 읽는 화면의 표준이다. 61개 조를 위에서부터 훑게 두지 않고
   검색으로 바로 찾게 한다 — 검색어가 들어오면 걸리는 조만 남기고 본문에 표시한다.
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

/** 검색어에 걸린 부분만 표시한다. 검색어가 없으면 원문 그대로. */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const out: ReactNode[] = [];
  let from = 0;
  for (;;) {
    const at = lower.indexOf(q, from);
    if (at < 0) break;
    if (at > from) out.push(text.slice(from, at));
    out.push(
      <mark key={at} className="bg-accent text-on-accent">
        {text.slice(at, at + q.length)}
      </mark>,
    );
    from = at + q.length;
  }
  out.push(text.slice(from));
  return <>{out}</>;
}

function matches(a: ArticleItem, q: string): boolean {
  if (!q) return true;
  const hay = `${a.title}\n${a.paragraphs.join("\n")}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

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
  const [query, setQuery] = useState("");
  const q = query.trim();

  /** 검색어에 걸린 조만 남긴 섹션 목록. 검색어가 없으면 원본 그대로. */
  const shown = useMemo(() => {
    if (!q) return sections;
    return sections
      .map((s) => (s.articles ? { ...s, articles: s.articles.filter((a) => matches(a, q)) } : s))
      .filter((s) => !s.articles || s.articles.length > 0);
  }, [sections, q]);

  const hitCount = useMemo(
    () => (q ? shown.reduce((n, s) => n + (s.articles?.length ?? 0), 0) : 0),
    [shown, q],
  );

  useEffect(() => {
    const targets = shown
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => !!el);
    if (targets.length === 0) return;

    // 화면 상단 1/3 지점을 지난 마지막 장을 현재 위치로 본다.
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -66% 0px", threshold: 0 },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [shown]);

  return (
    <div className="grid-site">
      {/* 검색 + 목차 */}
      <nav aria-label="목차" className="lg:col-span-2">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+5rem)]">
          {searchLabel !== undefined && (
            <div className="mb-7 print:hidden">
              <label htmlFor="article-search" className="text-xs font-bold text-muted">
                {searchLabel}
              </label>
              <div className="relative mt-2">
                <input
                  id="article-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="field-base h-11 w-full pr-9 text-s"
                />
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                >
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="M16 16l4 4" strokeLinecap="square" />
                </svg>
              </div>
              {q && (
                <p className="mt-2 text-xs text-muted">
                  {hitCount > 0 ? `${hitCount}개 조에서 찾았습니다` : "찾는 내용이 없습니다"}
                </p>
              )}
            </div>
          )}

          <p className="type-display text-xs tracking-[0.08em] text-muted">TABLE OF CONTENTS</p>
          <ul className="mt-5 max-h-[50vh] overflow-y-auto border-t border-border/25 print:max-h-none print:overflow-visible">
            {shown.map((s) => (
              <li key={s.id} className="border-b border-border/15">
                <a
                  href={`#${s.id}`}
                  aria-current={activeId === s.id ? "true" : undefined}
                  className={`block break-keep py-3 text-s transition-colors hover:text-foreground ${
                    activeId === s.id ? "font-bold text-foreground" : "text-muted"
                  }`}
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* 본문 */}
      <div className="min-w-0 lg:col-span-4">
        {shown.length === 0 && (
          <p className="text-s text-muted">「{q}」 이(가) 들어간 조문이 없습니다.</p>
        )}
        {shown.map((s) => (
          <section
            key={s.id}
            id={s.id}
            className="scroll-mt-[calc(var(--header-h)+5rem)] pb-14"
          >
            <h4 className="type-kr-heading text-h4-m sm:text-h4">{s.title}</h4>
            <div className="mt-7 space-y-8">
              {s.articles
                ? s.articles.map((a, i) => (
                    <Article
                      key={`${a.title}-${i}`}
                      title={a.title}
                      paragraphs={a.paragraphs}
                      query={q}
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

/** 조 — H5 제목 + 항 목록 */
export function Article({
  title,
  paragraphs,
  query = "",
}: {
  title: string;
  paragraphs: string[];
  query?: string;
}) {
  return (
    <article>
      <h5 className="type-kr-heading break-keep text-h5-m sm:text-h5">
        <Highlight text={title} query={query} />
      </h5>
      <div className="mt-4 space-y-3">
        {paragraphs.map((p, i) => (
          <p key={i} className="measure break-keep text-s leading-7 text-muted-strong">
            <Highlight text={p} query={query} />
          </p>
        ))}
      </div>
    </article>
  );
}
