// 로그인·회원가입 등 인증 엔드포인트용 간단한 인메모리 레이트리밋(고정 윈도우).
// 단일 인스턴스(Render 웹 서비스 1대) 전제 — 수평 확장 시 Redis 등으로 교체할 것.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  if (bucket.count > limit) return false;
  return true;
}

// Render 등 리버스 프록시 뒤에서 실제 클라이언트 IP를 얻는다.
export function clientIpFrom(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}

// 주기적으로 만료된 버킷 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 10 * 60 * 1000).unref?.();
