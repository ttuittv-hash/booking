import type { HomeNarrativeStatement } from "@/lib/content/types";

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
      {/* 리드는 빈 줄로 문단을 나눈다 */}
      <div className="mt-6 max-w-3xl space-y-4 break-keep text-m text-muted">
        {lead
          .split(/\n{2,}/)
          .map((para) => para.trim())
          .filter(Boolean)
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
            className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-5 border-b border-border/30 py-7 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:gap-x-8 sm:py-8"
          >
            <span className="type-display text-h5-m leading-none tabular-nums sm:text-h3">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
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
