import type { HomeNarrativeStatement } from "@/lib/content/types";
import { splitParagraphs } from "@/lib/content/prose";

/**
 * `**강조**` 만 지원하는 최소 인라인 렌더.
 * 각 선언의 마무리 문장을 굵게 잡는 용도다 — 링크·목록 같은 다른 마크업은 쓰지 않는다.
 * 블랙 지면에서 본문은 muted(#AAA), 강조는 foreground(오프화이트)로 벌어진다.
 */
function Emphasized({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-bold text-foreground">
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

/**
 * 설계 선언 — Figma Wireframe › **Layout / 608** (Breakpoint=Desktop) 규격.
 *
 *   Section Title   Heading  Archivo 800 / 96 (모바일 36) · lh 0.9
 *                   Text     18 (모바일 16)
 *   List Item ×N    좌 : 번호  Archivo 800 / 48 (모바일 36), 폭 60 + 간격 32
 *                   우 : Heading Archivo 800 / 48 (모바일 24)
 *                        Text    16
 *                   항목 사이 헤어라인
 *
 * 블랙 지면 위 흰 텍스트 — 상위에서 `<Band tone="dark">` 로 감싼다.
 * Tagline 슬롯은 시스템 규칙에 따라 비운다. 링크·호버·버튼은 두지 않는다.
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
    <div>
      {/* Section Title */}
      <h2 className="type-display text-h1-m leading-[0.9] sm:text-d2">
        {title.split("\n").map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </h2>
      {/* 리드의 문단 규칙은 `splitParagraphs` 한 곳에서 정한다 — Enter 한 번이 새 문단 */}
      <div className="mt-6 max-w-3xl space-y-4 break-keep text-m text-muted">
        {splitParagraphs(lead)
          .map((para, i) => (
            <p key={i}>
              <Emphasized text={para} />
            </p>
          ))}
      </div>

      {/* List — 번호 열 + 본문 열, 항목 사이 헤어라인 */}
      <ol className="mt-10 border-t border-border/30">
        {statements.map((s, i) => (
          <li
            key={s.title}
            /* 번호는 1칼럼, 본문은 남은 11칼럼 — 12칼럼에서 1칼럼(≈71px)이 번호 폭에
               맞아떨어져 글머리를 그리드 위에 그대로 올릴 수 있다 */
            className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-5 border-b border-border/30 py-7 sm:gap-x-8 sm:py-8 lg:grid-cols-12 lg:gap-x-[var(--gutter)]"
          >
            <span className="type-display text-h5-m leading-none tabular-nums sm:text-h3 lg:col-span-1">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="lg:col-span-11">
              <h3 className="type-display text-h5-m leading-none sm:text-h3">
                {s.title}
              </h3>
              <p className="mt-3 max-w-3xl break-keep text-s text-muted">
                <Emphasized text={s.desc} />
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
