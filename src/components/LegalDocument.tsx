import { findTerms } from "@/lib/terms";

/**
 * 공개 약관 페이지(/terms, /privacy) 본문 렌더러.
 *
 * 예전에는 이 두 페이지가 각자 조문을 하드코딩하고 있었다. 그러다 보니 가입할 때 동의한
 * 문서와 공개 페이지에 걸린 문서가 서로 달라졌다 — 동의 이력에는 해시까지 남는데 정작
 * 사람이 읽는 페이지는 다른 내용이었다는 뜻이다. 그래서 본문은 lib/terms 하나만 보고,
 * 여기서는 문단을 조문 단위로 끊어 보여주기만 한다.
 */

/** 조문 제목으로 볼 줄 — "제12조 (…)", "부칙", "1. 수집하는 …" */
function isHeading(line: string): boolean {
  return /^제\d+조/.test(line) || line === "부칙" || /^\d+\.\s/.test(line);
}

/** 앞 공백으로 들여쓴 줄은 원문에서 하위 항목이다 — 왼쪽 여백으로 살린다. */
function Line({ text }: { text: string }) {
  const indented = /^\s/.test(text);
  return (
    <p className={indented ? "pl-4 sm:pl-5" : undefined}>{text.trim()}</p>
  );
}

export function LegalDocument({ kind }: { kind: "SERVICE" | "PRIVACY_REQUIRED" }) {
  const doc = findTerms(kind);
  if (!doc) return null;

  // 제목 줄을 만날 때마다 새 조문을 시작한다. 첫 제목 앞에 오는 머리말은 조문 없이 그대로 둔다.
  const sections: { title: string | null; lines: string[] }[] = [{ title: null, lines: [] }];
  for (const line of doc.body.split("\n")) {
    if (isHeading(line)) sections.push({ title: line, lines: [] });
    else sections[sections.length - 1].lines.push(line);
  }

  return (
    <div className="max-w-3xl space-y-10">
      {sections.map((section, i) => {
        const lines = section.lines.filter((line) => line.trim() !== "");
        if (!section.title && lines.length === 0) return null;
        return (
          <section
            key={i}
            className={section.title ? "border-t border-border/25 pt-7" : undefined}
          >
            {section.title ? (
              <h2 className="type-kr-heading text-h6-m sm:text-h6">{section.title}</h2>
            ) : null}
            <div
              className={`space-y-3 text-r leading-8 text-muted-strong ${section.title ? "mt-4" : ""}`}
            >
              {lines.map((line, j) => (
                <Line key={j} text={line} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
