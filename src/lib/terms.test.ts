import { describe, expect, it } from "vitest";
import {
  DEFAULT_REGISTER_TERMS,
  normalizeRegisterTerms,
  termsBodyHash,
  termsForClient,
  type RegisterTermsContent,
} from "./terms";

const stored: RegisterTermsContent = {
  documents: [
    { kind: "SERVICE", version: "2026-08-01", title: "이용약관", required: true, body: "원래 본문" },
    { kind: "PRIVACY_REQUIRED", version: "2026-08-01", title: "개인정보 동의", required: true, body: "개인정보 본문" },
    { kind: "PRIVACY_OPTIONAL", version: "2026-08-01", title: "마케팅 동의", required: false, body: "마케팅 본문" },
  ],
};

describe("normalizeRegisterTerms — 저장 요청을 다듬는다", () => {
  it("본문을 고치고 버전을 그대로 두면 오늘 날짜로 올린다", () => {
    const next = normalizeRegisterTerms(
      { documents: [{ ...stored.documents[0], body: "고친 본문" }] },
      stored,
      "2026-09-04",
    );
    expect(next.documents[0]).toMatchObject({ body: "고친 본문", version: "2026-09-04" });
    // 손대지 않은 문서는 그대로다
    expect(next.documents[1]).toEqual(stored.documents[1]);
  });

  it("운영자가 버전을 직접 적었으면 그 값을 쓴다", () => {
    const next = normalizeRegisterTerms(
      { documents: [{ ...stored.documents[0], body: "고친 본문", version: "v2" }] },
      stored,
      "2026-09-04",
    );
    expect(next.documents[0].version).toBe("v2");
  });

  it("본문이 그대로면 버전도 그대로다", () => {
    const next = normalizeRegisterTerms({ documents: stored.documents }, stored, "2026-09-04");
    expect(next).toEqual(stored);
  });

  it("본문을 비우거나 모르는 종류를 보내면 무시하고 기존 문서를 지킨다", () => {
    const next = normalizeRegisterTerms(
      { documents: [{ kind: "SERVICE", body: "   " }, { kind: "UNKNOWN", body: "새 문서" }] },
      stored,
      "2026-09-04",
    );
    expect(next).toEqual(stored);
  });

  it("필수 여부와 종류는 요청으로 바꿀 수 없다", () => {
    const next = normalizeRegisterTerms(
      { documents: [{ kind: "PRIVACY_OPTIONAL", required: true, title: "새 제목" }] },
      stored,
      "2026-09-04",
    );
    expect(next.documents[2]).toMatchObject({ required: false, title: "새 제목" });
  });

  it("요청이 아예 아니면 기존 문서를 그대로 돌려준다", () => {
    expect(normalizeRegisterTerms(null, stored, "2026-09-04")).toEqual(stored);
    expect(normalizeRegisterTerms({ documents: "x" }, stored, "2026-09-04")).toEqual(stored);
  });
});

describe("termsForClient — 화면에 내려줄 목록", () => {
  it("본문 해시를 함께 실어 준다", () => {
    const [first] = termsForClient(stored.documents);
    expect(first.bodyHash).toBe(termsBodyHash("원래 본문"));
  });

  it("기본값은 코드에 있는 약관 3종이다", () => {
    expect(DEFAULT_REGISTER_TERMS.documents.map((d) => d.kind)).toEqual([
      "SERVICE",
      "PRIVACY_REQUIRED",
      "PRIVACY_OPTIONAL",
    ]);
  });
});
