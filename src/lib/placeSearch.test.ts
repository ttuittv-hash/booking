import { afterEach, describe, expect, it, vi } from "vitest";
import { isPlaceSearchConfigured, searchPlaces } from "./placeSearch";

const KEY = "KAKAO_REST_API_KEY";

afterEach(() => {
  delete process.env[KEY];
  vi.unstubAllGlobals();
});

function stubFetch(payload: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => payload,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("searchPlaces", () => {
  it("키가 없으면 기능을 끈다 — 가입이 막히면 안 된다", async () => {
    expect(isPlaceSearchConfigured()).toBe(false);
    expect(await searchPlaces("와이지엔터테인먼트")).toEqual({ status: "UNCONFIGURED" });
  });

  it("법인명과 도로명주소를 뽑아 준다", async () => {
    process.env[KEY] = "test-key";
    stubFetch({
      documents: [
        {
          place_name: "와이지엔터테인먼트",
          road_address_name: "서울 마포구 희우정로1길 3",
          address_name: "서울 마포구 합정동 397-5",
          category_name: "부동산 > 사무실",
        },
      ],
    });
    const result = await searchPlaces("와이지엔터테인먼트");
    expect(result).toEqual({
      status: "OK",
      places: [
        {
          name: "와이지엔터테인먼트",
          roadAddress: "서울 마포구 희우정로1길 3",
          jibunAddress: "서울 마포구 합정동 397-5",
          category: "부동산 > 사무실",
        },
      ],
    });
  });

  it("주소가 아예 없는 건은 버린다 — 우편번호를 확정할 수 없다", async () => {
    process.env[KEY] = "test-key";
    stubFetch({
      documents: [
        { place_name: "주소 없는 곳", road_address_name: "", address_name: "" },
        { place_name: "지번만 있는 곳", road_address_name: "", address_name: "서울 중구 을지로 1" },
      ],
    });
    const result = await searchPlaces("검색어");
    expect(result.status).toBe("OK");
    if (result.status !== "OK") return;
    expect(result.places).toHaveLength(1);
    expect(result.places[0].name).toBe("지번만 있는 곳");
  });

  it("키를 헤더로만 보낸다 — 쿼리스트링에 실으면 로그에 남는다", async () => {
    process.env[KEY] = "secret-key";
    const fetchMock = stubFetch({ documents: [] });
    await searchPlaces("서울아레나");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).not.toContain("secret-key");
    expect((init.headers as Record<string, string>).Authorization).toBe("KakaoAK secret-key");
  });

  it("외부 응답이 실패해도 예외를 던지지 않는다", async () => {
    process.env[KEY] = "test-key";
    stubFetch({}, false, 401);
    const result = await searchPlaces("서울아레나");
    expect(result.status).toBe("ERROR");
  });

  it("빈 검색어는 호출하지 않고 빈 결과를 준다", async () => {
    process.env[KEY] = "test-key";
    const fetchMock = stubFetch({ documents: [] });
    expect(await searchPlaces("   ")).toEqual({ status: "OK", places: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
