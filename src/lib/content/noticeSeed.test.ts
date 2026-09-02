import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SEED_NOTICE } from "./noticeSeed";
import { sanitizeRichText } from "@/lib/sanitizeHtml";

/*
  공고는 **원본 문서 그대로** 나가야 한다 — 웹 조판으로 옮기면 표 배치·여백이 달라진다.
  그래서 이 시드의 핵심은 본문이 아니라 첨부(PDF)다.
*/
describe("첫 공지 시드", () => {
  it("공고문 원본 파일이 저장소에 있다", () => {
    const file = path.join(process.cwd(), "assets", "seed", SEED_NOTICE.attachmentFile);
    expect(fs.existsSync(file)).toBe(true);
    expect(fs.statSync(file).size).toBeGreaterThan(50_000);
  });

  // 첨부 라우트는 `{uuid}.{확장자}` 형식만 받는다 — 어긋나면 400 이라 화면이 빈다.
  it("첨부 주소가 라우트가 받는 형식이다", () => {
    expect(SEED_NOTICE.attachmentStoredName).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(SEED_NOTICE.attachmentUrl).toBe(
      `/api/notices/attachment/${SEED_NOTICE.attachmentStoredName}`,
    );
  });

  // PDF 여야 공지 화면이 뷰어로 펼친다(그 외 확장자는 내려받기만 된다).
  it("PDF 라서 화면에서 그대로 펼쳐진다", () => {
    expect(SEED_NOTICE.attachmentName.toLowerCase().endsWith(".pdf")).toBe(true);
  });

  /*
    [회귀 2026-09-02] 본문을 짧은 안내로 줄이고 PDF 만 남긴 적이 있다. 그 환경에
    첨부 파일이 없자 화면에 아무것도 남지 않았다("공지가 엑박으로 나온다").
    글은 어느 환경에서나 뜬다 — 전문은 본문에 있어야 한다.
  */
  it("본문에 공고 전문이 있고 필터를 통과한다", () => {
    const clean = sanitizeRichText(SEED_NOTICE.body);
    expect(clean).toContain("서울아레나의 첫 무대가 열립니다");
    expect(clean).toContain("<h2><span>01 OVERVIEW</span>공고 개요</h2>");
    expect(clean).toContain("<th>신청 자격</th>");
    expect(clean.length).toBeGreaterThan(SEED_NOTICE.body.length * 0.95);
  });

  it("공고의 뼈대(01~08)가 모두 있다", () => {
    for (const section of [
      "01 OVERVIEW",
      "02 SCHEDULE",
      "03 HOW TO APPLY",
      "04 RENTAL RATES",
      "05 EVALUATION",
      "06 CONTRACT",
      "07 NOTE",
      "08 CONTACT",
    ]) {
      expect(SEED_NOTICE.body).toContain(section);
    }
  });

  it("외부 링크를 넣지 않는다 — 운영자 편집 콘텐츠의 규칙", () => {
    expect(SEED_NOTICE.body).not.toMatch(/https?:\/\//);
  });
});
