// 로그인·회원가입 등 인증 엔드포인트용 레이트리밋(고정 윈도우).
//
// 카운터는 DB(rate_limits 테이블)에 둔다. 예전에는 프로세스 메모리에 있었는데,
// 그러면 (1) 서버를 재시작할 때마다 시도 횟수가 0으로 초기화되고,
// (2) 서버를 여러 대로 늘리면 각자 세기 때문에 제한이 대수만큼 느슨해진다.
import { consumeRateLimit } from "./db";

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  return consumeRateLimit(key, limit, windowMs);
}

// 리버스 프록시(apigw → 게이트웨이) 뒤에서 클라이언트 IP를 얻는다.
// 주의: X-Forwarded-For 는 클라이언트가 위조할 수 있어 IP 기준 제한만으로는 우회가 가능하다.
// 실질적인 방어는 아이디 단위 제한(login:id:*)에 있다.
export function clientIpFrom(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}
