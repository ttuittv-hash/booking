"use client";

import { useEffect, useState, type ReactNode } from "react";

/* ============================================================================
   Figma `2607 서울아레나 웹사이트 Full › Wireframe › Content / 1`

     좌 2컬럼 : 스티키 목차(Table of contents) — 현재 위치를 굵게
     우 4컬럼 : 본문 — 장(H4) · 조(H5) · 항(본문) 순서
     좁은 화면에서는 목차가 본문 위 접이식으로 떨어진다.

   조문처럼 긴 규범 문서를 읽는 화면의 표준이다.
   ========================================================================= */

export interface ArticleSection {
  id: string;
  /** 목차와 본문에 함께 쓰는 제목 */
  title: string;
  body: ReactNode;
}

export function ArticleLayout({ sections }: { sections: ArticleSection[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const targets = sections
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
  }, [sections]);

  return (
    <div className="grid-site">
      {/* 목차 */}
      <nav aria-label="목차" className="lg:col-span-2">
        <div className="lg:sticky lg:top-28">
          <p className="type-display text-xs tracking-[0.08em] text-muted">TABLE OF CONTENTS</p>
          <ul className="mt-5 max-h-[60vh] overflow-y-auto border-t border-border/25 print:max-h-none print:overflow-visible">
            {sections.map((s) => (
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
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-24 pb-14">
            <h4 className="type-kr-heading text-h4-m sm:text-h4">{s.title}</h4>
            <div className="mt-7 space-y-8">{s.body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

/** 조 — H5 제목 + 항 목록 */
export function Article({ title, paragraphs }: { title: string; paragraphs: string[] }) {
  return (
    <article>
      <h5 className="type-kr-heading break-keep text-h5-m sm:text-h5">{title}</h5>
      <div className="mt-4 space-y-3">
        {paragraphs.map((p, i) => (
          <p key={i} className="measure break-keep text-s leading-7 text-muted-strong">
            {p}
          </p>
        ))}
      </div>
    </article>
  );
}
