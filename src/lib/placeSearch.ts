/*
  상호명으로 주소 찾기 (2026-08-30).

  우편번호 찾기(다음 우편번호 서비스)의 원본은 행정안전부 도로명주소 DB다. 거기에는
  도로명·지번·**등기된 건물명**만 있고 상호는 없다 — "와이지엔터테인먼트"는 그 건물에
  세든 회사 이름이지 건물명이 아니라서 아무리 쳐도 안 나온다. 가입자는 자기 회사 이름을
  치는 게 당연해서 이 자리에서 계속 막혔다.

  그래서 상호 검색은 장소 DB를 따로 쓴다(카카오 로컬 키워드 검색). 다만 이 API 는
  우편번호를 주지 않으므로, 여기서는 **도로명주소까지만** 찾고 우편번호는 그 주소로
  기존 우편번호 위젯을 열어 확정한다. 주소 한 벌을 두 출처에서 섞어 만들지 않는다.

  KAKAO_REST_API_KEY 가 없으면 기능을 끈다 — NICE·알림톡과 같은 관례로, 외부 서비스가
  없다고 가입이 막히면 안 된다. 이때는 예전처럼 도로명·건물명 검색만 쓴다.
*/

const ENDPOINT = "https://dapi.kakao.com/v2/local/search/keyword.json";
const MAX_RESULTS = 10;
/** 가입 화면에서 부르는 외부 API 라 오래 붙들지 않는다 — 느리면 직접 입력이 더 빠르다. */
const TIMEOUT_MS = 4000;

export function isPlaceSearchConfigured(): boolean {
  return !!process.env.KAKAO_REST_API_KEY;
}

export interface PlaceHit {
  /** 상호명 — 사용자가 검색한 말과 맞는지 눈으로 확인하는 값 */
  name: string;
  /** 도로명주소. 이 값을 우편번호 위젯에 넣어 우편번호를 확정한다. */
  roadAddress: string;
  /** 지번주소 — 도로명이 없는 오래된 건물에 대비한 대체값 */
  jibunAddress: string;
  /** "부동산 > 사무실" 같은 분류. 동명 업소가 여럿일 때 고르는 단서가 된다. */
  category: string;
}

export type PlaceSearchResult =
  | { status: "OK"; places: PlaceHit[] }
  | { status: "UNCONFIGURED" }
  | { status: "ERROR"; message: string };

export async function searchPlaces(query: string): Promise<PlaceSearchResult> {
  if (!isPlaceSearchConfigured()) return { status: "UNCONFIGURED" };
  const q = query.trim();
  if (!q) return { status: "OK", places: [] };

  const url = `${ENDPOINT}?query=${encodeURIComponent(q)}&size=${MAX_RESULTS}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("[placeSearch] 카카오 로컬 응답 오류", res.status);
      return { status: "ERROR", message: "상호명 검색을 이용할 수 없습니다. 주소로 검색하거나 직접 입력해 주세요." };
    }
    const data = (await res.json()) as {
      documents?: {
        place_name?: string;
        road_address_name?: string;
        address_name?: string;
        category_name?: string;
      }[];
    };
    const places = (data.documents ?? [])
      // 도로명·지번 어느 쪽도 없으면 우편번호를 확정할 수 없어 보여줄 이유가 없다.
      .filter((d) => d.road_address_name || d.address_name)
      .map((d) => ({
        name: d.place_name ?? "",
        roadAddress: d.road_address_name ?? "",
        jibunAddress: d.address_name ?? "",
        category: d.category_name ?? "",
      }));
    return { status: "OK", places };
  } catch (error) {
    // 타임아웃·네트워크 오류. 가입을 막지 않고 직접 입력으로 넘긴다.
    console.error("[placeSearch] 오류", error);
    return { status: "ERROR", message: "상호명 검색이 지연되고 있습니다. 주소로 검색하거나 직접 입력해 주세요." };
  }
}
