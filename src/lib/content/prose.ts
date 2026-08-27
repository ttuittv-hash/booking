/* ============================================================================
   운영자가 콘텐츠 관리에서 입력한 **평문**을 화면에 문단으로 싣는다.

   백오피스의 여러 줄 입력칸(`Area`)은 저장할 때 줄바꿈을 그대로 보관한다.
   그런데 HTML 은 줄바꿈을 공백 한 칸으로 접기 때문에, 그 값을 `{text}` 로 그냥
   그리면 운영자가 Enter 로 나눈 문단이 화면에서 한 덩어리로 붙어 버린다.
   그래서 렌더링 직전에 이 함수로 문단을 나눈다.

   규칙은 문서 편집기와 같다 — **Enter 한 번은 줄바꿈, 빈 줄(Enter 두 번)이 새 문단.**
   리드처럼 두 줄로 끊어 읽히는 문장은 문단을 새로 열지 않고 줄만 바꿔야 한다.
   문단은 위아래 간격이 벌어지므로 줄바꿈과 다른 뜻이 된다.
   ========================================================================= */

/** 평문을 문단 배열로 나눈다. 문단 안의 한 줄 바꿈은 그대로 남는다(`Prose` 가 살려 그린다) */
export function splitParagraphs(text: string | null | undefined): string[] {
  return (text ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}



/**
 * 리치텍스트로 저장된 값을 평문으로 되돌린다.
 * 리드 칸을 여러 줄 입력칸으로 바꾸기 전에 저장된 HTML 이 그대로 노출되지 않게 한다 —
 * 문단은 빈 줄, `<br>` 은 한 줄 바꿈으로 옮긴다.
 */
export function htmlToPlain(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (!/<[a-z][^>]*>/i.test(raw)) return raw;
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-4]|li|blockquote)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
