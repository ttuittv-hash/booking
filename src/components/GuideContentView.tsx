import type { ReactNode } from "react";
import type { GuideContent } from "@/lib/content/types";
import {
  ArrowRight,
  Band,
  ButtonLink,
  EmptyState,
  Label,
  SectionHead,
  btnClass,
} from "@/components/ui/kit";

/**
 * 대관 안내 본문 — /guide 와 운영자 미리보기(GuideContentForm)가 공유한다.
 * 섹션 구분은 여백이 아니라 Band 톤 교대로 하고, 절차·유의사항은 카드 박스 없이
 * 헤어라인 로우로 세운다. 앵커(#overview #process #rates #rules)는 헤더·푸터
 * 내비게이션이 참조하므로 그대로 유지한다.
 */

/**
 * 리치 에디터 HTML 렌더 규칙.
 * 옐로(#FFCD00)는 밝은 지면에서 대비 1.5:1 이라 텍스트 색으로 쓰지 않는다.
 * 본문 링크는 검정 + 밑줄로 처리한다(디자인 시스템 1장).
 */
const RICH_TEXT_CLS =
  "[&_a]:font-bold [&_a]:text-foreground [&_a]:underline [&_li]:mt-1 [&_p]:my-3 [&_p]:first:mt-0 [&_p]:last:mb-0 [&_strong]:font-bold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5";

/** 운영자 미리보기에서는 링크를 죽이고 버튼 모양만 남긴다. */
function GuideCta({
  href,
  children,
  variant = "outline",
  disabled,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost";
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span aria-disabled className={`${btnClass(variant, "lg")} opacity-40`}>
        {children}
      </span>
    );
  }
  return (
    <ButtonLink href={href} variant={variant} size="lg">
      {children}
    </ButtonLink>
  );
}

export function GuideContentView({
  content,
  disableLinks,
}: {
  content: GuideContent;
  disableLinks?: boolean;
}) {
  const { intro, steps, notices, packageIntro, packageBullets, rulesIntro } = content;

  return (
    <>
      {/* ── 대관 개요 (#overview) ─────────────────────────────────────────── */}
      <Band tone="light" size="lg" id="overview" className="scroll-mt-24">
        <Label className="mb-6 text-muted">Book It</Label>
        <h1 className="type-display text-d2-m sm:text-h1 lg:text-d2">Book It</h1>
        <p className="type-kr-heading mt-6 text-h4-m sm:text-h4">대관 안내</p>
        <div
          className={`mt-8 max-w-3xl text-m text-muted ${RICH_TEXT_CLS}`}
          dangerouslySetInnerHTML={{ __html: intro }}
        />
      </Band>

      {/* ── 대관 절차 (#process) — 번호 + 제목 + 설명 헤어라인 로우 ───────── */}
      <Band tone="dark" size="lg" id="process" className="scroll-mt-24">
        <SectionHead
          tone="dark"
          label="Process"
          title="대관 절차"
          lead="회원가입부터 사후 정산까지 8단계로 진행됩니다. 각 단계의 제출서류와 협의 일정을 미리 확인하세요."
        />

        <ol className="mt-14 border-t border-inverse-fg/25">
          {steps.map((s) => (
            <li
              key={s.no}
              className="grid gap-2 border-b border-inverse-fg/25 py-7 sm:grid-cols-[4rem_minmax(0,16rem)_minmax(0,1fr)] sm:items-baseline sm:gap-8"
            >
              <span className="type-display text-h5 tabular-nums text-accent">{s.no}</span>
              <h3 className="type-kr-heading text-h6-m sm:text-h6">{s.title}</h3>
              <p className="text-s text-inverse-fg/80">{s.desc}</p>
            </li>
          ))}
        </ol>

        <div className="mt-16 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-16">
          <div>
            <Label className="text-inverse-muted">Notice</Label>
            <h3 className="type-kr-heading mt-4 text-h5-m sm:text-h5">유의사항</h3>
          </div>
          <ul className="border-t border-inverse-fg/25">
            {notices.map((n) => (
              <li
                key={n}
                className="flex gap-4 border-b border-inverse-fg/25 py-4 text-s text-inverse-fg/80"
              >
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 bg-accent" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </Band>

      {/* ── 대관 패키지 구성 개요 (#rates) ────────────────────────────────── */}
      <Band tone="light" id="rates" className="scroll-mt-24">
        <SectionHead
          label="Packages"
          title="대관 패키지 구성"
          lead={
            <div className={RICH_TEXT_CLS} dangerouslySetInnerHTML={{ __html: packageIntro }} />
          }
        />

        <ol className="mt-12 border-t border-border/25">
          {packageBullets.map((b, i) => (
            <li
              key={b}
              className="grid gap-2 border-b border-border/25 py-6 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-8"
            >
              <span className="type-display text-h6 tabular-nums text-muted">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-m text-muted-strong">{b}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10">
          <GuideCta href="/packages" variant="primary" disabled={disableLinks}>
            패키지 구성 확인하기
            <ArrowRight />
          </GuideCta>
        </div>
      </Band>

      {/* ── 대관 규약 (#rules) ────────────────────────────────────────────── */}
      <Band tone="white" id="rules" className="scroll-mt-24">
        <SectionHead
          label="Rules"
          title="대관 규약"
          lead={<div className={RICH_TEXT_CLS} dangerouslySetInnerHTML={{ __html: rulesIntro }} />}
        />
        <div className="mt-12">
          <EmptyState
            title="서울아레나 대관규약 전문"
            desc="자료 준비 중입니다. 공개 전까지는 대관 담당자를 통해 규약 전문을 확인하세요."
          />
        </div>
      </Band>

      {/* ── 관련 자료 ────────────────────────────────────────────────────── */}
      <Band tone="accent" size="md">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Label>Documents</Label>
            <h2 className="type-kr-heading mt-4 text-h3-m sm:text-h3">
              공연 준비에 필요한 자료를 함께 확인하세요.
            </h2>
            <p className="mt-4 max-w-xl text-m">
              대관 신청·계약·공연 준비 단계의 서식과 시설 이미지 사용 기준을 모아두었습니다.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <GuideCta href="/guide/forms" disabled={disableLinks}>
              대관 양식함
              <ArrowRight />
            </GuideCta>
            <GuideCta href="/guide/image-guide" variant="ghost" disabled={disableLinks}>
              이미지 가이드
            </GuideCta>
          </div>
        </div>
      </Band>
    </>
  );
}
