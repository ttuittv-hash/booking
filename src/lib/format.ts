export function won(amount: number): string {
  return `₩${Math.round(amount).toLocaleString("ko-KR")}`;
}

export function num(amount: number): string {
  return Math.round(amount).toLocaleString("ko-KR");
}
