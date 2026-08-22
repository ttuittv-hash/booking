/* ============================================================================
   운영자가 콘텐츠 관리에서 입력한 **평문**을 화면에 문단으로 싣는다.

   백오피스의 여러 줄 입력칸(`Area`)은 저장할 때 줄바꿈을 그대로 보관한다.
   그런데 HTML 은 줄바꿈을 공백 한 칸으로 접기 때문에, 그 값을 `{text}` 로 그냥
   그리면 운영자가 Enter 로 나눈 문단이 화면에서 한 덩어리로 붙어 버린다.
   그래서 렌더링 직전에 이 함수로 문단을 나눈다.

   규칙은 문서 편집기와 같게 둔다 — **빈 줄이 새 문단, 한 번의 줄바꿈은 줄바꿈.**
   ========================================================================= */

/** 평문을 문단 배열로 나눈다. 빈 문단은 버린다. */
export function splitParagraphs(text: string | null | undefined): string[] {
  return (text ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

/** 평문에 실제 내용이 있는지 */
export function hasProse(text: string | null | undefined): boolean {
  return splitParagraphs(text).length > 0;
}

const ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (ch) => ESCAPE[ch] ?? ch);
}

/**
 * 평문을 `<p>` 문단 HTML 로 바꾼다. 이미 HTML 태그로 저장된 값(리치텍스트
 * 편집기로 쓴 공지·리드 등)은 손대지 않고 그대로 돌려준다 —
 * 두 저장 형식이 한 필드에 섞여 있어도 같은 함수를 통과시킬 수 있어야 한다.
 */
export function proseToHtml(text: string | null | undefined): string {
  const raw = (text ?? "").trim();
  if (!raw) return "";
  if (/<(p|div|ul|ol|h[1-4]|blockquote|table|br)\b/i.test(raw)) return raw;
  return splitParagraphs(raw)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`)
    .join("");
}
