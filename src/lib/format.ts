export function won(amount: number): string {
  return `₩${Math.round(amount).toLocaleString("ko-KR")}`;
}

/**
 * 단위 없는 수 — 수량·건수·인원처럼 통화가 아닌 값에 쓴다.
 *
 * 표 규칙(`docs/design-system.md` §4)이 "단위 행을 두지 않고, 수량은 숫자만,
 * 금액은 셀마다 ₩" 이므로 `won()` 과 짝으로 필요하다. 통화 기호를 붙이지 않는다.
 */
export function num(amount: number): string {
  return Math.round(amount).toLocaleString("ko-KR");
}
