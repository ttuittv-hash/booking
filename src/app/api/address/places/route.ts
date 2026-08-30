import { NextResponse } from "next/server";
import { clientIpFrom, rateLimit } from "@/lib/rateLimit";
import { isPlaceSearchConfigured, searchPlaces } from "@/lib/placeSearch";

// 법인명으로 주소 찾기 (2026-08-30).
//
// 회원가입은 비로그인 화면이라 사람 단위로 셀 수 없다 — IP 로만 막는다. 카카오 로컬은
// 일 호출량이 정해져 있어, 한 사람이 창을 열어 두고 계속 두드리면 다른 가입자가 못 쓴다.
// 키는 서버에만 둔다(클라이언트로 내보내면 그대로 새어 나간다).
const LIMIT_PER_IP = 60;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_QUERY_CHARS = 60;

export async function GET(request: Request) {
  if (!isPlaceSearchConfigured()) {
    return NextResponse.json({ error: "법인명 검색이 설정되지 않았습니다." }, { status: 503 });
  }
  if (!(await rateLimit(`place-search:${clientIpFrom(request)}`, LIMIT_PER_IP, WINDOW_MS))) {
    return NextResponse.json(
      { error: "검색 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  const q = (new URL(request.url).searchParams.get("q") ?? "").slice(0, MAX_QUERY_CHARS).trim();
  if (q.length < 2) {
    return NextResponse.json({ error: "두 글자 이상 입력해 주세요." }, { status: 400 });
  }

  const result = await searchPlaces(q);
  if (result.status === "OK") return NextResponse.json({ places: result.places });
  if (result.status === "UNCONFIGURED") {
    return NextResponse.json({ error: "법인명 검색이 설정되지 않았습니다." }, { status: 503 });
  }
  return NextResponse.json({ error: result.message }, { status: 502 });
}
