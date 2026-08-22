import { describe, it, expect } from "vitest";
import { buildVerificationBadges, overallVerdict } from "./verificationBadges";

// 기획서 A9 — 운영자가 보는 근거 7개. 목록과 상세가 같은 판정을 보여야 한다.
const baseCompany = {
  id: "c1",
  name: "테스트",
  businessRegistrationNumber: "1208147521",
  representativeName: "홍길동",
  postalCode: null,
  address: null,
  businessCertUrl: null,
  businessCertName: null,
  createdAt: "2026-08-19",
  status: "PENDING" as const,
  masterUserId: null,
  companyPhone: null,
  companyFax: null,
  corporateNumber: null,
  representativePhone: null,
  representativeFax: null,
  corporateRegistrationNumber: null,
  companyType: null,
  verification: {
    status: "VERIFIED" as const,
    companyName: "테스트",
    representativeName: "홍길동",
    compStatus: "1",
    compStatusLabel: "정상",
    compTypeLabel: "일반",
    message: null,
    checkedAt: "2026-08-19",
  },
};
const baseUser = {
  email: "hong@seoul-ent.co.kr",
  identityVerifiedAt: "2026-08-19",
  companyRole: "MASTER" as const,
};

function build(over: Partial<Parameters<typeof buildVerificationBadges>[0]> = {}) {
  return buildVerificationBadges({
    user: baseUser,
    company: baseCompany,
    duplicated: false,
    ...over,
  } as Parameters<typeof buildVerificationBadges>[0]);
}

describe("검증 배지 7종", () => {
  it("항목이 정확히 7개다", () => expect(build()).toHaveLength(7));

  it("모두 통과하면 자동 승인 대상이다", () => {
    expect(overallVerdict(build())).toBe("AUTO");
  });

  it("본인인증이 없으면 확인 필요로 잡힌다", () => {
    const b = build({ user: { ...baseUser, identityVerifiedAt: null } });
    expect(b.find((x) => x.key === "identity")?.state).toBe("WARN");
    expect(overallVerdict(b)).toBe("REVIEW");
  });

  it("폐업(8)이면 사업자 상태가 확인 필요다", () => {
    const c = { ...baseCompany, verification: { ...baseCompany.verification, compStatus: "8", compStatusLabel: "폐업" } };
    const b = build({ company: c });
    expect(b.find((x) => x.key === "compStatus")?.state).toBe("WARN");
    expect(b.find((x) => x.key === "compStatus")?.detail).toBe("폐업");
  });

  it("휴업(7)·부도(6)도 확인 필요다", () => {
    for (const code of ["6", "7"]) {
      const c = { ...baseCompany, verification: { ...baseCompany.verification, compStatus: code } };
      expect(build({ company: c }).find((x) => x.key === "compStatus")?.state).toBe("WARN");
    }
  });

  it("상호 불일치는 차단이 아니라 기록으로 남는다", () => {
    const c = { ...baseCompany, verification: { ...baseCompany.verification, message: "상호 불일치(등록: 네이버)" } };
    const b = build({ company: c });
    expect(b.find((x) => x.key === "nameMatch")?.state).toBe("WARN");
    expect(b.find((x) => x.key === "nameMatch")?.detail).toContain("네이버");
  });

  it("무료 메일 도메인은 확인 필요로 표시된다", () => {
    const b = build({ user: { ...baseUser, email: "hong@gmail.com" } });
    expect(b.find((x) => x.key === "emailDomain")?.state).toBe("WARN");
  });

  it("회사 도메인은 통과다", () => {
    expect(build().find((x) => x.key === "emailDomain")?.state).toBe("PASS");
  });

  it("중복 가입이 있으면 확인 필요다", () => {
    expect(build({ duplicated: true }).find((x) => x.key === "duplicate")?.state).toBe("WARN");
  });

  it("이전에 미승인된 회사면 이상 신호로 잡힌다", () => {
    const b = build({ company: { ...baseCompany, status: "REJECTED" as const } });
    expect(b.find((x) => x.key === "abnormal")?.state).toBe("WARN");
  });

  it("진위확인 이력이 없으면 정보 없음으로 둔다(오탐을 만들지 않는다)", () => {
    const b = build({ company: { ...baseCompany, verification: null } });
    expect(b.find((x) => x.key === "compStatus")?.state).toBe("NONE");
    expect(b.find((x) => x.key === "nameMatch")?.state).toBe("NONE");
  });
});
