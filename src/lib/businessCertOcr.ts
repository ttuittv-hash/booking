// 사업자등록증 첨부파일 판독·대조 (2026-09-02).
//
// 지금까지 첨부된 사업자등록증은 확장자와 크기만 검사하고 그대로 저장했다 —
// 파일 내용은 아무도 읽지 않았고, 진위 판단은 전적으로 운영자의 눈이었다.
// 사업자등록번호 자체는 NICE 법인실명확인으로 국세청에 조회하지만(nice.ts),
// "실존하는 남의 회사 번호를 적고 아무 이미지나 올리는" 경우는 걸러지지 않는다.
//
// 그래서 심사 화면에서 운영자가 [대조] 를 누르면 첨부 파일을 실제로 읽어
// 등록번호·상호·대표자를 뽑고 가입 입력값과 맞춰 본다.
//
// 두 가지 원칙:
//
// 1) 이건 판단 보조지 차단 수단이 아니다. 휴대폰으로 비스듬히 찍은 사진, 도장이
//    글자를 덮은 스캔은 흔하고 그때마다 판독이 실패한다. 실패를 "위조"로 읽으면
//    멀쩡한 신청자가 막힌다 — 결과는 언제나 화면에 표시만 하고, 승인/거절은
//    운영자가 한다. NICE 상호 불일치를 차단하지 않고 기록만 하는 것과 같은 이유다.
// 2) 조회는 심사 시점에만 한다. 가입 흐름에 넣으면 외부 호출이 가입을 느리게 하고,
//    아무도 안 보는 건까지 비용이 나간다.
//
// ANTHROPIC_API_KEY 가 없으면 기능을 끈다(NICE·알림톡·규약봇과 같은 관례).

import fs from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { DATA_DIR } from "./dataDir";

const MODEL = process.env.CERT_OCR_MODEL || "claude-opus-5";
const MAX_TOKENS = 1000;
const TIMEOUT_MS = 60_000;

const UPLOAD_ROOT = path.join(DATA_DIR, "uploads", "registration-attachments");
// 업로드 라우트가 발급한 주소만 받는다. 임의 경로가 들어오면 파일시스템을 훑게 된다.
const ATTACHMENT_URL_RE = /^\/api\/auth\/register\/attachment\/([0-9a-f-]{36}\.[a-z0-9]{1,10})$/;

const MEDIA_TYPE: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

export function isBusinessCertOcrConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/** 첨부 URL → 디스크 경로. 형식이 다르면 null (경로조작 방지) */
export function attachmentPathFromUrl(fileUrl: string): string | null {
  const matched = ATTACHMENT_URL_RE.exec(fileUrl);
  if (!matched) return null;
  return path.join(UPLOAD_ROOT, matched[1]);
}

// ── 판독 결과 ────────────────────────────────────────────────

/** 문서에서 읽어낸 값. 읽지 못한 칸은 빈 문자열이다(모델이 지어내지 않도록 null 대신 빈 값으로 받는다). */
export interface CertExtraction {
  /** 사업자등록증(또는 사업자등록증명원)으로 보이는가 */
  isBusinessCert: boolean;
  businessNumber: string;
  companyName: string;
  representativeName: string;
  /** 개업연월일 (YYYY-MM-DD) */
  openedOn: string;
  /** 판독이 어려웠던 부분에 대한 모델의 메모 */
  note: string;
}

export type CertFieldState = "MATCH" | "MISMATCH" | "UNREADABLE" | "NONE";

export interface CertFieldCompare {
  key: "businessNumber" | "companyName" | "representativeName";
  label: string;
  /** 가입 때 입력한 값 */
  expected: string;
  /** 등록증에서 읽은 값 */
  extracted: string;
  state: CertFieldState;
}

export type CertCheckStatus =
  /** 세 항목 모두 입력값과 같다 */
  | "MATCH"
  /** 등록번호는 같은데 상호·대표자에 차이가 있다 */
  | "PARTIAL"
  /** 등록번호가 다르다 — 가장 강한 신호 */
  | "MISMATCH"
  /** 글자를 읽어내지 못했다(사진 품질 등) */
  | "UNREADABLE"
  /** 사업자등록증이 아닌 문서로 보인다 */
  | "NOT_CERT"
  /** 미설정·호출 실패 */
  | "ERROR";

export interface CertCheckResult {
  status: CertCheckStatus;
  fields: CertFieldCompare[];
  extraction: CertExtraction | null;
  /** 개업연월일 등 대조 대상은 아니지만 화면에 보여줄 값 */
  openedOn: string;
  /** 운영자에게 보여줄 한 줄 설명 */
  message: string;
  checkedAt: string;
}

export interface CertExpectedValues {
  businessNumber: string;
  companyName: string;
  representativeName: string;
}

// ── 표기 정규화 ──────────────────────────────────────────────
//
// 등록증과 입력값은 같은 회사라도 표기가 다르다. "(주)카카오" / "주식회사 카카오" /
// "카카오" 는 모두 같은 회사고, 이걸 불일치로 띄우면 경고가 늘 켜져 있어 아무도
// 보지 않게 된다. 법인격 표기와 공백·기호를 걷어내고 비교한다.

const CORPORATE_FORMS =
  /주식회사|유한책임회사|유한회사|합자회사|합명회사|사회복지법인|재단법인|사단법인|의료법인|학교법인|영농조합법인/g;

export function normalizeBrn(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizeCompanyName(value: string): string {
  return value
    .replace(/\(\s*[주유재사]\s*\)/g, "")
    .replace(/[㈜㈔㈐]/g, "")
    .replace(CORPORATE_FORMS, "")
    .replace(/[\s·․.,\-_'"()]/g, "")
    .toLowerCase();
}

export function normalizePersonName(value: string): string {
  return value.replace(/\s/g, "");
}

/**
 * 대표자 대조. 공동대표는 등록증에 "홍길동, 김철수" 또는 "홍길동 외 1명" 으로 찍히므로
 * 입력한 대표자가 그 안에 있으면 일치로 본다.
 */
export function representativeMatches(extracted: string, expected: string): boolean {
  const want = normalizePersonName(expected);
  if (!want) return false;
  return extracted
    .split(/[,、·/]|외/)
    .map(normalizePersonName)
    .filter(Boolean)
    .includes(want);
}

// ── 대조 판정 ────────────────────────────────────────────────

function compareField(
  key: CertFieldCompare["key"],
  label: string,
  expected: string,
  extracted: string,
  matches: (a: string, b: string) => boolean,
): CertFieldCompare {
  const trimmedExpected = expected.trim();
  const trimmedExtracted = extracted.trim();
  let state: CertFieldState;
  if (!trimmedExpected) state = "NONE";
  else if (!trimmedExtracted) state = "UNREADABLE";
  else state = matches(trimmedExtracted, trimmedExpected) ? "MATCH" : "MISMATCH";
  return { key, label, expected: trimmedExpected, extracted: trimmedExtracted, state };
}

const STATUS_MESSAGE: Record<Exclude<CertCheckStatus, "ERROR">, string> = {
  MATCH: "등록증의 등록번호·상호·대표자가 가입 입력값과 모두 일치합니다.",
  PARTIAL:
    "등록번호는 일치합니다. 상호·대표자에 차이가 있으니 표기 차이인지 확인해 주세요.",
  MISMATCH:
    "등록증의 사업자등록번호가 가입 입력값과 다릅니다. 다른 회사의 등록증일 수 있으니 확인이 필요합니다.",
  UNREADABLE:
    "첨부 파일에서 글자를 읽어내지 못했습니다. 사진 품질 문제일 수 있으니 파일을 직접 열어 확인해 주세요.",
  NOT_CERT:
    "사업자등록증이 아닌 문서로 보입니다. 첨부 파일을 직접 열어 확인해 주세요.",
};

/** 판독 결과와 가입 입력값을 맞춰 본다. 순수 함수 — 외부 호출 없음. */
export function compareExtraction(
  extraction: CertExtraction,
  expected: CertExpectedValues,
): CertCheckResult {
  const fields: CertFieldCompare[] = [
    compareField(
      "businessNumber",
      "사업자등록번호",
      expected.businessNumber,
      extraction.businessNumber,
      (a, b) => normalizeBrn(a).length === 10 && normalizeBrn(a) === normalizeBrn(b),
    ),
    compareField("companyName", "상호(법인명)", expected.companyName, extraction.companyName, (a, b) => {
      const left = normalizeCompanyName(a);
      const right = normalizeCompanyName(b);
      return !!left && left === right;
    }),
    compareField(
      "representativeName",
      "대표자",
      expected.representativeName,
      extraction.representativeName,
      representativeMatches,
    ),
  ];

  const brn = fields[0];
  const checked = fields.filter((f) => f.state !== "NONE");

  let status: CertCheckStatus;
  if (!extraction.isBusinessCert) {
    status = "NOT_CERT";
  } else if (brn.state === "MISMATCH") {
    status = "MISMATCH";
  } else if (checked.length > 0 && checked.every((f) => f.state === "UNREADABLE")) {
    status = "UNREADABLE";
  } else if (checked.some((f) => f.state !== "MATCH")) {
    status = "PARTIAL";
  } else {
    status = "MATCH";
  }

  return {
    status,
    fields,
    extraction,
    openedOn: extraction.openedOn.trim(),
    message: STATUS_MESSAGE[status as Exclude<CertCheckStatus, "ERROR">],
    checkedAt: new Date().toISOString(),
  };
}

function errorResult(message: string): CertCheckResult {
  return {
    status: "ERROR",
    fields: [],
    extraction: null,
    openedOn: "",
    message,
    checkedAt: new Date().toISOString(),
  };
}

// ── 판독 ─────────────────────────────────────────────────────

// 모델이 빈 칸을 지어내지 않도록 스키마를 고정한다. 못 읽은 칸은 null 대신 빈 문자열로
// 받는다 — 구조화 출력의 타입 유니온을 쓰지 않아도 되고, 화면에서 분기가 하나 준다.
const EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "isBusinessCert",
    "businessNumber",
    "companyName",
    "representativeName",
    "openedOn",
    "note",
  ],
  properties: {
    isBusinessCert: {
      type: "boolean",
      description: "문서가 사업자등록증 또는 사업자등록증명원이면 true, 아니면 false",
    },
    businessNumber: {
      type: "string",
      description: "등록번호 10자리 (예: 120-81-47521). 읽을 수 없으면 빈 문자열",
    },
    companyName: {
      type: "string",
      description: "법인명(단체명) 또는 상호. 읽을 수 없으면 빈 문자열",
    },
    representativeName: {
      type: "string",
      description: "성명(대표자). 공동대표면 쉼표로 구분. 읽을 수 없으면 빈 문자열",
    },
    openedOn: {
      type: "string",
      description: "개업연월일 YYYY-MM-DD. 읽을 수 없으면 빈 문자열",
    },
    note: {
      type: "string",
      description: "판독이 어려웠던 부분이 있으면 한 문장. 없으면 빈 문자열",
    },
  },
} as const;

const PROMPT = `첨부된 문서는 대한민국 국세청이 발급하는 사업자등록증(또는 사업자등록증명원)이어야 한다.
문서에 실제로 인쇄된 글자만 그대로 옮겨라.

지켜야 할 것:
- 보이지 않거나 확신이 서지 않는 칸은 반드시 빈 문자열로 둔다. 추측해서 채우지 않는다.
  이 값은 가입 입력값과 대조되므로, 지어낸 한 글자가 멀쩡한 신청자를 의심받게 만든다.
- 등록번호는 문서에 적힌 하이픈 포함 형식 그대로 옮긴다.
- 법인명(단체명) 칸이 있으면 그 값을, 없으면 상호 칸의 값을 companyName 으로 쓴다.
  "(주)" 같은 법인격 표기도 문서에 적힌 대로 남긴다.
- 사업자등록증이 아닌 문서(명함, 통장 사본, 빈 이미지, 다른 증명서 등)라면
  isBusinessCert 를 false 로 두고 나머지는 빈 문자열로 둔다.`;

/**
 * 첨부 파일을 읽어 등록증의 값을 뽑고 가입 입력값과 대조한다.
 * 실패는 예외가 아니라 status: "ERROR" 로 돌려준다 — 심사 화면이 멈추면 안 된다.
 */
export async function checkBusinessCert(
  fileUrl: string,
  expected: CertExpectedValues,
): Promise<CertCheckResult> {
  if (!isBusinessCertOcrConfigured()) {
    return errorResult("판독 기능이 설정되지 않았습니다. (ANTHROPIC_API_KEY 미설정)");
  }

  const filePath = attachmentPathFromUrl(fileUrl);
  if (!filePath) return errorResult("첨부 파일 주소가 올바르지 않습니다.");

  const mediaType = MEDIA_TYPE[path.extname(filePath).toLowerCase()];
  if (!mediaType) return errorResult("PDF·JPG·PNG 파일만 판독할 수 있습니다.");

  let base64: string;
  try {
    base64 = (await fs.readFile(filePath)).toString("base64");
  } catch {
    return errorResult("첨부 파일을 찾을 수 없습니다.");
  }

  try {
    const client = new Anthropic();
    const document: Anthropic.ContentBlockParam =
      mediaType === "application/pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
        : {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/jpeg" | "image/png",
              data: base64,
            },
          };

    const response = await client.messages.parse(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        // 정해진 서식에서 글자를 옮기는 일이라 깊게 생각할 필요가 없다.
        output_config: { effort: "low", format: { type: "json_schema", schema: EXTRACTION_SCHEMA } },
        messages: [{ role: "user", content: [document, { type: "text", text: PROMPT }] }],
      },
      { timeout: TIMEOUT_MS },
    );

    // 안전 거절은 200 으로 돌아온다 — 결과를 읽기 전에 확인한다.
    if (response.stop_reason === "refusal") {
      return errorResult("판독이 거절되었습니다. 첨부 파일을 직접 열어 확인해 주세요.");
    }

    const parsed = response.parsed_output as CertExtraction | null;
    if (!parsed) return errorResult("판독 결과를 해석하지 못했습니다. 다시 시도해 주세요.");

    return compareExtraction(
      {
        isBusinessCert: !!parsed.isBusinessCert,
        businessNumber: parsed.businessNumber ?? "",
        companyName: parsed.companyName ?? "",
        representativeName: parsed.representativeName ?? "",
        openedOn: parsed.openedOn ?? "",
        note: parsed.note ?? "",
      },
      expected,
    );
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return errorResult("요청이 몰리고 있습니다. 잠시 후 다시 시도해 주세요.");
    }
    if (error instanceof Anthropic.APIError) {
      console.error("[businessCertOcr] API 오류", error.status, error.message);
      return errorResult("판독 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }
    console.error("[businessCertOcr] 오류", error);
    return errorResult("판독 중 오류가 발생했습니다.");
  }
}
