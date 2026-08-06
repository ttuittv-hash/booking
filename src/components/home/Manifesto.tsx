import type { HomeNarrativeStatement } from "@/lib/content/types";

/**
 * 브랜드 선언문(카카오 브랜드 가이드라인 3.4 BUSINESS › HOST IT.).
 *
 * 5개 문단(선언 1 + 리드 1 + 본문 3)을 **하나의 타이포 설정**으로 통일해 흘린다.
 * 크기·색을 문단마다 바꾸지 않는다 — 선언문은 위계가 아니라 한 덩어리의 목소리다.
 * 색은 `text-foreground` 로 두어 블랙 밴드 안에서 자동으로 흰 계열이 된다.
 *
 * 측정폭(measure)은 `max-w-[22ch]`… 가 아니라 컨테이너 폭으로 제한한다.
 * 32px 국문에서 한 줄이 22~26자를 넘으면 눈이 되돌아오지 못하므로 48rem 을 상한으로 둔다.
 * 링크·호버·버튼은 두지 않는다.
 */
export function Manifesto({
  title,
  lead,
  statements,
}: {
  title: string;
  lead: string;
  statements: HomeNarrativeStatement[];
}) {
  const paragraphs = [title.replace(/\n/g, " "), lead, ...statements.map((s) => s.desc)];

  return (
    <div className="max-w-3xl space-y-6 sm:space-y-8">
      {paragraphs.map((text, i) => (
        <p
          key={i}
          className="type-kr-heading text-h5-m break-keep text-foreground sm:text-h4"
        >
          {text}
        </p>
      ))}
    </div>
  );
}
