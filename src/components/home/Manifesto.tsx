"use client";

import Link from "next/link";
import { useState } from "react";
import type { HomeNarrativeStatement } from "@/lib/content/types";
import { ArrowRight } from "@/components/ui/kit";

/**
 * 브랜드 선언문(카카오 브랜드 가이드라인 3.4 BUSINESS › HOST IT.).
 * 하나의 문단으로 읽히되, 세 대목에 마우스를 올리면 그 대목이 강조되고
 * 문단 아래 고정 자리에 근거 페이지로 가는 버튼이 나타난다.
 * 버튼을 문단 안에 두면 숨은 상태에서도 자리를 차지해 글줄에 구멍이 생긴다.
 *
 * 강조색으로 옐로를 쓰므로 이 섹션은 반드시 블랙 지면 위에 놓는다.
 * (#FFCD00 on #000 = 약 11:1. 밝은 지면 위 옐로 텍스트는 1.5:1 이라 금지)
 */
export function Manifesto({
  title,
  lead,
  statements,
  closing,
}: {
  title: string;
  lead: string;
  statements: HomeNarrativeStatement[];
  closing: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const current = active === null ? null : statements[active];

  return (
    <div>
      <p className="type-kr-heading max-w-5xl text-h4-m leading-[1.45] sm:text-h3 lg:text-h2">
        <span>{title.replace(/\n/g, " ")} </span>
        <span className="text-muted">{lead} </span>

        {statements.map((s, i) => (
          <Link
            key={s.href + i}
            href={s.href}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive((v) => (v === i ? null : v))}
            onFocus={() => setActive(i)}
            onBlur={() => setActive((v) => (v === i ? null : v))}
            className={`outline-none transition-colors duration-200 ${
              active === i ? "text-accent" : "text-foreground/85 hover:text-accent"
            }`}
          >
            {s.desc}{" "}
          </Link>
        ))}
      </p>

      {/* 버튼 자리 — 높이를 미리 잡아 호버할 때 문단이 움직이지 않게 한다 */}
      <div className="mt-10 flex h-12 items-center">
        {statements.map((s, i) => (
          <Link
            key={s.href + i}
            href={s.href}
            tabIndex={active === i ? 0 : -1}
            aria-hidden={active !== i}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive((v) => (v === i ? null : v))}
            className={`inline-flex h-12 items-center gap-2 border border-accent px-6 text-s font-bold text-accent transition-opacity duration-200 hover:bg-accent hover:text-on-accent ${
              active === i ? "opacity-100" : "pointer-events-none absolute opacity-0"
            }`}
          >
            {s.linkLabel}
            <ArrowRight />
          </Link>
        ))}
        {!current && (
          <span className="text-s text-muted">
            문장에 마우스를 올리면 근거가 되는 시설 정보로 이동할 수 있습니다.
          </span>
        )}
      </div>

      <p className="type-display mt-16 text-h4-m text-accent sm:text-h3">{closing}</p>
    </div>
  );
}
