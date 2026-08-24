import sanitizeHtml from "sanitize-html";

// TipTap 에디터로 작성되는 리치텍스트(공지사항 본문, 안내/소개 페이지 인트로 등)를
// dangerouslySetInnerHTML로 렌더링하기 전에 반드시 이 함수를 거친다.
// 저장 시(운영자 API)와 렌더링 시(서버 컴포넌트) 양쪽에서 호출해 이중으로 방어한다 —
// 과거에 저장된(sanitize 이전) 데이터도 렌더링 시점에 걸러진다.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr", "blockquote", "pre", "code",
    "h1", "h2", "h3", "h4",
    "strong", "b", "em", "i", "u", "s", "strike", "mark", "span",
    "ul", "ol", "li",
    "a", "img",
    "table", "thead", "tbody", "tr", "th", "td", "colgroup", "col",
    // HTML 소스 모드에서 접고 펼치는 문단을 만들 때 쓴다(NoticeEditor) — 네이티브 토글이라 JS가 없다.
    "details", "summary",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    th: ["colspan", "rowspan", "colwidth"],
    td: ["colspan", "rowspan", "colwidth"],
    col: ["span", "style"],
    "*": ["style"],
  },
  // style은 TipTap이 쓰는 색상/정렬만 허용한다 (expression·url 등 위험한 값 차단)
  allowedStyles: {
    "*": {
      color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/],
      "background-color": [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/],
      "text-align": [/^(left|right|center|justify)$/],
      width: [/^\d+(px|%)$/],
    },
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  // 프로토콜 상대 URL(//evil.com) 차단, 상대경로(/api/notices/image/..)는 허용
  allowProtocolRelative: false,
  // target=_blank 링크에 rel 보강
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: attribs.target === "_blank" ? { ...attribs, rel: "noopener noreferrer" } : attribs,
    }),
  },
};

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html ?? "", OPTIONS);
}
