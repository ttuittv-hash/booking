/**
 * 운영자가 쓴 평문 안의 `[대관료](/rates)` 를 링크 조각으로 나눈다 (2026-09-02).
 *
 * 대관 절차 설명에서 "대관료·규약·공지사항" 같은 말이 나오면 그 페이지로 바로 갈 수
 * 있어야 한다는 요청. 운영자가 콘텐츠 관리에서 직접 링크를 넣을 수 있게 마크다운과
 * 같은 표기를 쓴다.
 *
 * **우리 사이트 안(`/` 로 시작)만 링크가 된다.** 운영자 화면에 임의 URL 을 심을 수 있게
 * 두면 그 문구가 그대로 신청자에게 보이는 피싱 링크가 된다 — 외부 주소는 링크로 만들지
 * 않고 대괄호를 벗긴 글자만 남긴다. `//evil.example.com` 은 프로토콜 상대 URL 이라 외부다.
 *
 * 렌더링은 kit.tsx 의 InlineLinks 가 한다. 판정 규칙만 여기 두고 테스트로 고정한다.
 */
export type InlinePart =
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string };

export function parseInlineLinks(text: string): InlinePart[] {
  // 정규식은 매번 새로 만든다 — /g 는 lastIndex 를 갖는 상태라, 모듈 수준에 두고 여러
  // 곳에서 쓰면 앞의 호출이 남긴 위치부터 훑어 링크를 건너뛴다.
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  const parts: InlinePart[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", text: text.slice(last, m.index) });
    const [, label, href] = m;
    if (href.startsWith("/") && !href.startsWith("//")) {
      parts.push({ type: "link", text: label, href });
    } else {
      parts.push({ type: "text", text: label });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", text: text.slice(last) });
  return parts;
}
