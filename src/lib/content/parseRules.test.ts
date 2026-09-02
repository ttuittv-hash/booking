import { describe, expect, it } from "vitest";
import { parseRules } from "./pageContent";

// 좌측 목차는 이 함수가 뽑은 "장" 으로 만들어진다. 목차에서 빠지면 본문에는 있는데
// 찾아갈 수가 없다 — 규약은 길어서 스크롤로 찾는 문서가 아니다.
describe("parseRules", () => {
  it("장·조·항을 나눈다", () => {
    const chapters = parseRules(
      ["제1장 총칙", "제1조 (목적)", "① 이 규약은 …", "② 또한 …", "제2조 (적용범위)", "① …"].join(
        "\n",
      ),
    );
    expect(chapters).toHaveLength(1);
    expect(chapters[0].title).toBe("제1장 총칙");
    expect(chapters[0].articles.map((a) => a.title)).toEqual(["제1조 (목적)", "제2조 (적용범위)"]);
    expect(chapters[0].articles[0].paragraphs).toEqual(["① 이 규약은 …", "② 또한 …"]);
  });

  // [신규 2026-09-02] 부칙은 장 번호가 없어 목차에서 빠졌고, 시행일을 보려면
  // 본문 끝까지 스크롤해야 했다.
  it("부칙도 장으로 잡아 목차에 올린다", () => {
    const chapters = parseRules(
      ["제10장 대관 종료", "제57조 (준용)", "① …", "부칙", "제1조 (시행일)", "본 규약은 …"].join(
        "\n",
      ),
    );
    expect(chapters.map((c) => c.title)).toEqual(["제10장 대관 종료", "부칙"]);
    expect(chapters[1].articles.map((a) => a.title)).toEqual(["제1조 (시행일)"]);
  });

  it("부칙 뒤에 날짜가 붙어도 잡는다", () => {
    expect(parseRules("부칙 (2026.9.1.)\n제1조 (시행일)\n본 규약은 …")[0].title).toBe(
      "부칙 (2026.9.1.)",
    );
    expect(parseRules("부 칙\n제1조 (시행일)\n…")[0].title).toBe("부 칙");
  });

  it("장 번호가 붙은 부칙도 그대로 장이다", () => {
    // 시드 본문은 "제15장 부칙" 형태다 — 예전 규칙으로도 잡히던 것이 계속 잡혀야 한다.
    expect(parseRules("제15장 부칙\n제1조 (시행일)\n…")[0].title).toBe("제15장 부칙");
  });

  it("'부칙'으로 시작하는 다른 문장은 장으로 보지 않는다", () => {
    const chapters = parseRules("제1장 총칙\n제1조 (목적)\n부칙에 정한 바에 따른다");
    expect(chapters).toHaveLength(1);
    expect(chapters[0].articles[0].paragraphs).toEqual(["부칙에 정한 바에 따른다"]);
  });

  it("장 없이 조부터 시작하면 총칙으로 감싼다", () => {
    const chapters = parseRules("제1조 (목적)\n① …");
    expect(chapters[0].title).toBe("총칙");
  });
});
