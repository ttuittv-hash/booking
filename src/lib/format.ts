export function won(amount: number): string {
  return `₩${Math.round(amount).toLocaleString("ko-KR")}`;
}
