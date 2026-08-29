import { describe, expect, it } from "vitest";
import { systemPrompt } from "./rulesBot";

const RULES = { text: "제 27조 (계약의 해지)\n…", version: "Ver. 1.0", effectiveDate: "2026. 9. 1." };

describe("규약 문답 시스템 프롬프트", () => {
  it("규약 본문이 맨 앞에 오고 거기에만 캐시가 걸린다", () => {
    // 순서가 뒤집히면 매 요청 캐시가 깨져 입력 비용이 그대로 나간다.
    const blocks = systemPrompt(RULES);
    expect(blocks[0].text).toContain("제 27조 (계약의 해지)");
    expect(blocks[0].cache_control).toEqual({ type: "ephemeral" });
    expect(blocks[1].cache_control).toBeUndefined();
  });

  it("판본과 시행일을 함께 알려 준다", () => {
    const blocks = systemPrompt(RULES);
    expect(blocks[0].text).toContain("Ver. 1.0");
    expect(blocks[0].text).toContain("2026. 9. 1.");
  });

  it("근거 조문 인용과 '규약에 없음' 규칙을 지시한다", () => {
    // 이 두 줄이 이 기능의 전부다 — 지워지면 봇이 지어내기 시작한다.
    const instructions = systemPrompt(RULES)[1].text;
    expect(instructions).toContain("근거가 된 조문");
    expect(instructions).toContain("규약에는 그 내용이 없습니다");
    expect(instructions).toContain("추측해서 답하지 않는다");
  });
});
