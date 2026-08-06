import type { ReactNode } from "react";
import type { GuideContent } from "@/lib/content/types";
import {
  ArrowRight,
  Band,
  ButtonLink,
  CTABand,
  EmptyState,
  LayoutTextColumns,
  PageHeading,
  btnClass,
} from "@/components/ui/kit";

/**
 * 대관 안내 본문 — /guide 와 운영자 미리보기(GuideContentForm)가 공유한다.
 * 섹션 구분은 여백이 아니라 Band 톤 교대(light → dark → light → white → accent)로 하고,
 * 본문은 Figma Wireframe 의 레이아웃 모듈만 조합한다.
 * 앵커(#overview #process #rates #rules)는 헤더·푸터 내비게이션이 참조하므로 그대로 유지한다.
 */

/**
 * 리치 에디터 HTML 렌더 규칙.
 * 옐로(#FFCD00)는 밝은 지면에서 대비 1.5:1 이라 텍스트 색으로 쓰지 않는다.
 * 본문 링크는 검정 + 밑줄로 처리한다(디자인 시스템 1장).
 */
const RICH_TEXT_CLS =
  "[&_a]:font-bold [&_a]:text-foreground [&_a]:underline [&_li]:mt-1 [&_p]:my-3 [&_p]:first:mt-0 [&_p]:last:mb-0 [&_strong]:font-bold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5";

const no2 = (i: number) => String(i + 1).padStart(2, "0");

/** 리치텍스트 리드 — PageHeading 의 lead 는 div 로 감싸이므로 블록 태그가 안전하다. */
function RichLead({ html }: { html: string }) {
  return <div className={RICH_TEXT_CLS} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** 운영자 미리보기에서는 링크를 죽이고 버튼 모양만 남긴다. */
function GuideCta({
  href,
  children,
  variant = "secondary",
  disabled,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "tertiary";
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
        <h1 className="type-display text-d2-m sm:text-h1 lg:text-d2">Book It</h1>
        <p className="type-kr-heading mt-6 text-h4-m sm:text-h4">대관 안내</p>
        <div
          className={`mt-8 max-w-3xl text-m text-muted ${RICH_TEXT_CLS}`}
          dangerouslySetInnerHTML={{ __html: intro }}
        />
      </Band>

      {/* ── 대관 절차 (#process) — Figma Layout / 5 ───────────────────────── */}
      <Band tone="dark" size="lg" id="process" className="scroll-mt-24">
        <PageHeading
          as="h2"
          size="md"
          title="대관 절차"
          lead="회원가입부터 사후 정산까지 8단계로 진행됩니다. 각 단계의 제출서류와 협의 일정을 미리 확인하세요."
        />

        <div className="mt-14">
          <LayoutTextColumns
            columns={4}
            items={steps.map((s) => ({ title: `${s.no}. ${s.title}`, desc: s.desc }))}
          />
        </div>

        {notices.length > 0 && (
          <div className="mt-20">
            <h3 className="type-kr-heading text-h5-m sm:text-h5">유의사항</h3>
            <div className="mt-10">
              <LayoutTextColumns
                columns={2}
                items={notices.map((n, i) => ({ title: no2(i), desc: n }))}
              />
            </div>
          </div>
        )}
      </Band>

      {/* ── 대관 패키지 구성 개요 (#rates) ────────────────────────────────── */}
      <Band tone="light" id="rates" className="scroll-mt-24">
        <PageHeading
          as="h2"
          size="md"
          title="대관 패키지 구성"
          lead={<RichLead html={packageIntro} />}
        />

        <div className="mt-14">
          <LayoutTextColumns
            columns={3}
            items={packageBullets.map((b, i) => ({ title: no2(i), desc: b }))}
          />
        </div>

        <div className="mt-14">
          <GuideCta href="/packages" variant="primary" disabled={disableLinks}>
            패키지 구성 확인하기
            <ArrowRight />
          </GuideCta>
        </div>
      </Band>

      {/* ── 대관 규약 (#rules) ────────────────────────────────────────────── */}
      <Band tone="white" id="rules" className="scroll-mt-24">
        <PageHeading
          as="h2"
          size="md"
          title="대관 규약"
          lead={<RichLead html={rulesIntro} />}
        />
        <div className="mt-12">
          <EmptyState
            title="서울아레나 대관규약 전문"
            desc="자료 준비 중입니다. 공개 전까지는 대관 담당자를 통해 규약 전문을 확인하세요."
          />
        </div>
      </Band>

      {/* ── 관련 자료 (Figma CTA / 1) ─────────────────────────────────────── */}
      <CTABand
        title="공연 준비에 필요한 자료를 함께 확인하세요."
        lead="대관 신청·계약·공연 준비 단계의 서식과 시설 이미지 사용 기준을 모아두었습니다."
        actions={
          <>
            <GuideCta href="/guide/forms" variant="primary" disabled={disableLinks}>
              대관 양식함
              <ArrowRight />
            </GuideCta>
            <GuideCta href="/guide/image-guide" variant="secondary" disabled={disableLinks}>
              이미지 가이드
            </GuideCta>
          </>
        }
      />
    </>
  );
}
