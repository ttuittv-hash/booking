import { describe, expect, it } from "vitest";
import {
  attachmentPathFromUrl,
  compareExtraction,
  normalizeCompanyName,
  representativeMatches,
  type CertExtraction,
} from "./businessCertOcr";

const EXPECTED = {
  businessNumber: "120-81-47521",
  companyName: "주식회사 카카오",
  representativeName: "정신아",
};

function extraction(overrides: Partial<CertExtraction> = {}): CertExtraction {
  return {
    isBusinessCert: true,
    businessNumber: "120-81-47521",
    companyName: "주식회사 카카오",
    representativeName: "정신아",
    openedOn: "1995-02-16",
    note: "",
    ...overrides,
  };
}

describe("normalizeCompanyName", () => {
  it("법인격 표기가 달라도 같은 회사로 본다 — 아니면 경고가 늘 켜져 있다", () => {
    const forms = ["주식회사 카카오", "(주)카카오", "㈜카카오", "카카오 주식회사", "카카오"];
    const normalized = forms.map(normalizeCompanyName);
    expect(new Set(normalized).size).toBe(1);
  });

  it("다른 회사는 다르게 남는다", () => {
    expect(normalizeCompanyName("(주)카카오")).not.toBe(normalizeCompanyName("(주)네이버"));
  });
});

describe("representativeMatches", () => {
  it("공동대표 표기 안에 있으면 일치로 본다", () => {
    expect(representativeMatches("홍길동, 김철수", "김철수")).toBe(true);
    expect(representativeMatches("홍길동 외 1명", "홍길동")).toBe(true);
  });

  it("이름 사이 공백은 무시한다", () => {
    expect(representativeMatches("정 신 아", "정신아")).toBe(true);
  });

  it("다른 사람은 일치하지 않는다", () => {
    expect(representativeMatches("홍길동", "김철수")).toBe(false);
  });
});

describe("compareExtraction", () => {
  it("세 항목이 모두 같으면 MATCH", () => {
    const result = compareExtraction(extraction(), EXPECTED);
    expect(result.status).toBe("MATCH");
    expect(result.fields.every((f) => f.state === "MATCH")).toBe(true);
  });

  it("등록번호가 다르면 MISMATCH — 다른 회사 등록증일 수 있다", () => {
    const result = compareExtraction(extraction({ businessNumber: "220-81-62517" }), EXPECTED);
    expect(result.status).toBe("MISMATCH");
    expect(result.fields[0].state).toBe("MISMATCH");
  });

  it("등록번호는 맞고 상호만 다르면 PARTIAL — 차단이 아니라 확인 대상이다", () => {
    const result = compareExtraction(extraction({ companyName: "카카오엔터프라이즈" }), EXPECTED);
    expect(result.status).toBe("PARTIAL");
  });

  it("하이픈 유무는 등록번호 비교에 영향을 주지 않는다", () => {
    const result = compareExtraction(extraction({ businessNumber: "1208147521" }), EXPECTED);
    expect(result.fields[0].state).toBe("MATCH");
  });

  it("사업자등록증이 아니면 NOT_CERT", () => {
    const result = compareExtraction(
      extraction({ isBusinessCert: false, businessNumber: "", companyName: "", representativeName: "" }),
      EXPECTED,
    );
    expect(result.status).toBe("NOT_CERT");
  });

  it("아무 칸도 못 읽으면 UNREADABLE — 사진 품질 문제지 위조 판정이 아니다", () => {
    const result = compareExtraction(
      extraction({ businessNumber: "", companyName: "", representativeName: "" }),
      EXPECTED,
    );
    expect(result.status).toBe("UNREADABLE");
    expect(result.message).toContain("읽어내지 못했");
  });

  it("일부만 못 읽으면 PARTIAL 로 두고 나머지 판정은 살린다", () => {
    const result = compareExtraction(extraction({ representativeName: "" }), EXPECTED);
    expect(result.status).toBe("PARTIAL");
    expect(result.fields[2].state).toBe("UNREADABLE");
  });

  it("입력값이 없는 항목은 대조 대상에서 빠진다(NONE)", () => {
    const result = compareExtraction(extraction(), { ...EXPECTED, representativeName: "" });
    expect(result.fields[2].state).toBe("NONE");
    expect(result.status).toBe("MATCH");
  });

  it("등록번호가 10자리가 아니면 일치로 보지 않는다", () => {
    const result = compareExtraction(extraction({ businessNumber: "120-81" }), EXPECTED);
    expect(result.fields[0].state).toBe("MISMATCH");
  });
});

describe("attachmentPathFromUrl", () => {
  it("업로드 라우트가 발급한 주소만 받는다", () => {
    expect(
      attachmentPathFromUrl("/api/auth/register/attachment/3f2504e0-4f89-41d3-9a0c-0305e82c3301.png"),
    ).toContain("registration-attachments");
  });

  it("경로조작 시도는 거부한다", () => {
    expect(attachmentPathFromUrl("/api/auth/register/attachment/../../../etc/passwd")).toBeNull();
    expect(attachmentPathFromUrl("https://evil.example.com/x.png")).toBeNull();
    expect(attachmentPathFromUrl("/api/auth/register/attachment/notauuid.png")).toBeNull();
  });
});
