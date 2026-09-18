import { describe, expect, it } from "vitest";
import { showChoiceRow } from "./pageContent";

// [신규 2026-09-18] 관리자 「신청 내역」이 "위저드가 더는 묻지 않는 선택지 그룹"의 행을
// 숨기는 판정. 이 로직은 **화면으로 검증할 수 없다** — 로컬 DB 에는 꺼진 필드 설정이 없고
// (그래서 넷이 다 보이는 게 정상), 서버 컴포넌트라 브라우저에서 설정을 주입할 수도 없다.
// 그래서 단위 테스트가 유일한 확실한 검증 수단이다.
//
// 잘못 숨기면 심의 자료가 조용히 사라지고, 잘못 보여주면 「—」만 찍힌 빈 행이 남는다.
const GROUP = "performanceInfo.stageTypes";
const OPTIONS = ["END_STAGE", "CENTER_STAGE", "UNDECIDED", "OTHER"];

describe("showChoiceRow — 위저드가 안 묻는 선택지 그룹의 행을 숨긴다", () => {
  it("설정이 비어 있으면 보여준다(평소 상태)", () => {
    expect(showChoiceRow(false, GROUP, OPTIONS, [])).toBe(true);
  });

  it("그룹 자체가 꺼져 있으면 숨긴다", () => {
    expect(showChoiceRow(false, GROUP, OPTIONS, [GROUP])).toBe(false);
  });

  it("선택지가 하나도 안 남으면 숨긴다 — 신청자가 고를 수 있는 게 없다", () => {
    const allOff = OPTIONS.map((k) => `${GROUP}.${k}`);
    expect(showChoiceRow(false, GROUP, OPTIONS, allOff)).toBe(false);
  });

  it("선택지가 하나라도 남아 있으면 보여준다 — 신청자가 안 고른 것뿐이다", () => {
    const someOff = OPTIONS.slice(1).map((k) => `${GROUP}.${k}`);
    expect(showChoiceRow(false, GROUP, OPTIONS, someOff)).toBe(true);
  });

  it("고정 선택지가 전부 꺼져도 운영진이 만든 커스텀 항목이 남아 있으면 보여준다", () => {
    const allFixedOff = OPTIONS.map((k) => `${GROUP}.${k}`);
    expect(
      showChoiceRow(false, GROUP, OPTIONS, allFixedOff, { [GROUP]: ["custom-1726650000"] }),
    ).toBe(true);
  });

  it("값이 남아 있으면 꺼져 있어도 보여준다 — 끄기 전에 접수된 신청서의 심의 자료다", () => {
    expect(showChoiceRow(true, GROUP, OPTIONS, [GROUP])).toBe(true);
    const allOff = OPTIONS.map((k) => `${GROUP}.${k}`);
    expect(showChoiceRow(true, GROUP, OPTIONS, allOff)).toBe(true);
  });

  it("다른 그룹의 꺼짐 설정에는 영향받지 않는다", () => {
    const otherOff = ["performanceInfo.eventTypes", "performanceInfo.eventTypes.CONCERT"];
    expect(showChoiceRow(false, GROUP, OPTIONS, otherOff)).toBe(true);
  });
});
