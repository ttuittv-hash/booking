import type { HomeNarrativeStatement } from "@/lib/content/types";

/**
 * 브랜드 선언문(카카오 브랜드 가이드라인 3.4 BUSINESS › HOST IT.).
 *
 * 구성
 *   1행  큰 글씨          서울아레나는 단순한 베뉴가 아닙니다.
 *   2행  작은 글씨 · 회색  아티스트와 기획사의 상상력을 …
 *   3~5행 2행과 같은 크기 · 본문색   세 문장
 *
 * 링크·호버·버튼은 두지 않는다. 읽는 흐름을 끊지 않고 선언문 그대로 전달한다.
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
  return (
    <div className="max-w-5xl">
      <p className="type-kr-heading text-h3-m sm:text-h2">{title.replace(/\n/g, " ")}</p>

      <p className="mt-8 text-m text-muted sm:text-l">{lead}</p>

      <div className="mt-6 space-y-4 text-m text-foreground sm:text-l">
        {statements.map((s, i) => (
          <p key={i}>{s.desc}</p>
        ))}
      </div>
    </div>
  );
}
