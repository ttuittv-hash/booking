import { NextResponse } from "next/server";
import { searchCompaniesForJoin } from "@/lib/db";
import { clientIpFrom, rateLimit } from "@/lib/rateLimit";

// 회사정보 불러오기 검색(기획서 A6).
//
// 가입 첫 화면에 회사 목록을 자동으로 뿌리지 않는다 — 그렇게 두면 인증만 통과한
// 누구나 대관사 명단을 훑을 수 있다. 버튼을 눌러 이 API 를 호출했을 때만 결과가 나온다.
//
// 노출도 최소한으로 자른다:
//   - 승인 완료된 회사만 (심사 중·미승인·휴폐업 회사는 존재 자체를 알리지 않는다)
//   - 사업자등록번호는 마스킹, 주소는 시/군/구까지
//   - 최대 3건. 그 이상이면 더 좁혀 입력하도록 되돌린다
//   - IP 당 분당 호출 수 제한
export async function GET(request: Request) {
  const ip = clientIpFrom(request);
  if (!(await rateLimit(`company-search:${ip}`, 20, 60 * 1000))) {
    return NextResponse.json(
      { error: "검색 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const url = new URL(request.url);
  const field = url.searchParams.get("field") === "brn" ? "brn" : "name";
  const keyword = (url.searchParams.get("keyword") ?? "").trim();

  if (field === "brn") {
    // 사업자등록번호는 정확히 일치해야 한다 — 부분 일치를 허용하면 번호를 훑을 수 있다.
    const digits = keyword.replace(/\D/g, "");
    if (digits.length !== 10) {
      return NextResponse.json(
        { state: "TOO_SHORT", message: "사업자등록번호 10자리를 정확히 입력해주세요.", results: [] },
        { status: 200 },
      );
    }
  } else if (keyword.length < 2) {
    return NextResponse.json(
      { state: "TOO_SHORT", message: "2자 이상 입력해주세요.", results: [] },
      { status: 200 },
    );
  }

  const { total, results } = await searchCompaniesForJoin(field, keyword, 6);

  if (total === 0) {
    return NextResponse.json({
      state: "EMPTY",
      message: "찾으시는 회사가 없다면 회사 정보를 직접 입력해 신규 등록으로 진행해주세요.",
      results: [],
    });
  }
  if (total > 3) {
    return NextResponse.json({
      state: "TOO_MANY",
      message: "검색 결과가 많습니다. 회사명을 더 입력해주세요.",
      results: [],
    });
  }

  return NextResponse.json({ state: "OK", message: null, results });
}
