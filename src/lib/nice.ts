// NICE평가정보 「NICE아이디 — 법인실명확인」 연동.
// 사업자등록번호로 상호·대표자명·기업상태(정상/휴업/폐업)를 조회한다.
// 회원가입 시 입력값 대조와 폐업 업체 차단에 쓴다.
//
// NICE_CLIENT_ID / NICE_CLIENT_SECRET 이 없으면 조회를 건너뛴다(미설정 = 기능 꺼짐).
// 조회에 실패해도 가입 자체는 막지 않는다 — 외부 서비스 장애로 가입이 중단되면 안 되므로,
// "미확인" 상태로 남기고 운영자 심사 화면에 그대로 노출한다.

const BASE_URL = process.env.NICE_API_BASE_URL || "https://svc.niceapi.co.kr:22001";
const TOKEN_PATH = "/digital/niceid/oauth/oauth/token";
const COMPANY_CHECK_PATH = "/digital/niceid/api/v1.0/comp/check";

// 기업상태코드 (문서 기준)
const COMP_STATUS_LABEL: Record<string, string> = {
  "0": "정보없음",
  "1": "정상",
  "6": "부도",
  "7": "휴업",
  "8": "폐업",
  "9": "기타",
};

// 기업형태코드
const COMP_TYPE_LABEL: Record<string, string> = {
  "0": "정보없음",
  "1": "상장",
  "2": "등록",
  "3": "외감",
  "4": "일반",
  "5": "신설법인(2년 이내)",
};

export type CompanyCheckStatus =
  /** 조회 성공 — 실존하는 사업자 */
  | "VERIFIED"
  /** 조회는 됐으나 해당 사업자번호 정보를 보유하고 있지 않음 */
  | "NOT_FOUND"
  /** 미설정·장애·오류로 확인하지 못함 */
  | "UNCHECKED";

export interface CompanyCheckResult {
  status: CompanyCheckStatus;
  /** 조회된 상호 */
  companyName: string | null;
  /** 조회된 대표자명 */
  representativeName: string | null;
  /** 기업상태코드 (1 정상 / 7 휴업 / 8 폐업 …) */
  compStatus: string | null;
  compStatusLabel: string | null;
  compTypeLabel: string | null;
  /** 확인 시각 */
  checkedAt: string;
  /** UNCHECKED 인 경우 사유 (운영자 화면 표시용) */
  message: string | null;
}

function unchecked(message: string): CompanyCheckResult {
  return {
    status: "UNCHECKED",
    companyName: null,
    representativeName: null,
    compStatus: null,
    compStatusLabel: null,
    compTypeLabel: null,
    checkedAt: new Date().toISOString(),
    message,
  };
}

export function isNiceConfigured(): boolean {
  return !!(process.env.NICE_CLIENT_ID && process.env.NICE_CLIENT_SECRET);
}

declare global {
  var __niceToken: { value: string; expiresAt: number } | undefined;
}

// 토큰은 만료 전까지 재사용한다. 발급 횟수에 한도가 있어 매 요청 발급하면 안 된다.
// 여러 pod 가 각자 토큰을 발급받는 것은 정상 동작이다(사용자 단위가 아니라 기관 단위 토큰).
async function getAccessToken(): Promise<string | null> {
  const cached = globalThis.__niceToken;
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.value;

  const clientId = process.env.NICE_CLIENT_ID;
  const clientSecret = process.env.NICE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${BASE_URL}${TOKEN_PATH}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=default",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;

  const json = (await response.json()) as {
    dataHeader?: { GW_RSLT_CD?: string };
    dataBody?: { access_token?: string; expires_in?: number };
  };
  if (json.dataHeader?.GW_RSLT_CD !== "1200" || !json.dataBody?.access_token) return null;

  const expiresIn = json.dataBody.expires_in ?? 3600;
  globalThis.__niceToken = {
    value: json.dataBody.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };
  return json.dataBody.access_token;
}

export async function checkCompanyNumber(businessNumber: string): Promise<CompanyCheckResult> {
  const compNum = businessNumber.replace(/\D/g, "");
  if (compNum.length !== 10) return unchecked("사업자등록번호 형식이 올바르지 않습니다.");
  if (!isNiceConfigured()) return unchecked("사업자 진위확인이 설정되지 않았습니다.");

  try {
    const token = await getAccessToken();
    if (!token) return unchecked("사업자 진위확인 토큰 발급에 실패했습니다.");

    const response = await fetch(`${BASE_URL}${COMPANY_CHECK_PATH}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        client_id: process.env.NICE_CLIENT_ID as string,
        productID: process.env.NICE_PRODUCT_ID || "2101764012",
      },
      body: JSON.stringify({
        dataHeader: { CNTY_CD: "ko" },
        dataBody: { comp_num: compNum },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return unchecked(`사업자 진위확인 응답 오류 (HTTP ${response.status})`);

    const json = (await response.json()) as {
      dataHeader?: { GW_RSLT_CD?: string; GW_RSLT_MSG?: string };
      dataBody?: {
        rsp_cd?: string;
        res_msg?: string;
        result_cd?: string;
        comp_name?: string;
        representive_name?: string;
        comp_status?: string;
        comp_type?: string;
      };
    };

    if (json.dataHeader?.GW_RSLT_CD !== "1200") {
      return unchecked(`사업자 진위확인 실패 (${json.dataHeader?.GW_RSLT_MSG ?? "알 수 없는 오류"})`);
    }
    const body = json.dataBody;
    if (!body || body.rsp_cd !== "P000") {
      return unchecked(`사업자 진위확인 실패 (${body?.res_msg ?? body?.rsp_cd ?? "알 수 없는 오류"})`);
    }

    // result_cd — 01: 성공, 03: 미보유
    if (body.result_cd !== "01") {
      return {
        ...unchecked("국세청에 등록되지 않았거나 조회되지 않는 사업자등록번호입니다."),
        status: "NOT_FOUND",
      };
    }

    return {
      status: "VERIFIED",
      companyName: body.comp_name?.trim() || null,
      representativeName: body.representive_name?.trim() || null,
      compStatus: body.comp_status ?? null,
      compStatusLabel: body.comp_status ? (COMP_STATUS_LABEL[body.comp_status] ?? null) : null,
      compTypeLabel: body.comp_type ? (COMP_TYPE_LABEL[body.comp_type] ?? null) : null,
      checkedAt: new Date().toISOString(),
      message: null,
    };
  } catch (error) {
    // 타임아웃·네트워크 오류 등 — 가입을 막지 않고 미확인으로 남긴다.
    return unchecked(
      `사업자 진위확인 중 오류가 발생했습니다. (${error instanceof Error ? error.message : "알 수 없음"})`,
    );
  }
}

/** 휴업(7)·폐업(8)·부도(6)는 대관 계약 상대로 부적격이므로 가입을 막는다. */
export function isBlockedCompanyStatus(result: CompanyCheckResult): boolean {
  return result.status === "VERIFIED" && ["6", "7", "8"].includes(result.compStatus ?? "");
}

/** 이름 비교용 정규화 — 공백·괄호·주식회사 표기 차이를 흡수한다. */
export function normalizeCompanyName(name: string): string {
  return name
    .replace(/\(주\)|\(유\)|주식회사|유한회사|㈜/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}
