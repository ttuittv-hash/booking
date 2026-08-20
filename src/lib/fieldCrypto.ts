// 고유식별정보(CI/DI) 같은 민감 필드의 컬럼 단위 암호화.
//
// 본인인증(NICE 통합인증) 결과로 받는 CI/DI 는 고유식별정보라 평문 저장이 곤란하다.
// 그런데 DI 는 중복 가입 판별에 쓰이므로 "검색"도 가능해야 한다 — 암호문은 매번 값이
// 달라져 WHERE 로 못 찾는다. 그래서 두 가지를 함께 저장한다:
//
//   - encryptField(di)   : AES-256-GCM 암호문. 값을 다시 꺼내야 할 때 쓴다.
//   - blindIndex(di)     : HMAC-SHA256 고정값. UNIQUE 인덱스를 걸어 중복 판별에 쓴다.
//
// 블라인드 인덱스는 원문을 복원할 수 없지만 같은 원문이면 항상 같은 값이 나온다.
// 암호화 키와 인덱스 키를 분리해, 한쪽이 새도 다른 쪽 성질이 무너지지 않게 한다.

import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
/** 암호문 포맷 버전 — 키 교체나 알고리즘 변경 시 앞자리로 구분한다. */
const VERSION = "v1";

/**
 * 32바이트 키를 환경변수에서 읽는다.
 * hex(64자) 또는 base64 어느 쪽으로 넣어도 받는다.
 */
function readKey(envName: string): Buffer {
  const raw = process.env[envName];
  if (!raw) {
    throw new Error(
      `${envName} 환경변수가 없습니다. 본인인증 결과를 저장하려면 32바이트 키가 필요합니다.`,
    );
  }
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(`${envName} 는 32바이트여야 합니다 (현재 ${key.length}바이트).`);
  }
  return key;
}

/** 설정 여부만 확인한다 — 미설정이면 본인인증 저장 경로를 아예 막는 용도. */
export function isFieldCryptoConfigured(): boolean {
  return Boolean(process.env.FIELD_ENCRYPTION_KEY && process.env.FIELD_INDEX_KEY);
}

/**
 * 평문을 AES-256-GCM 으로 암호화한다.
 * 결과 형식: `v1:<iv>:<authTag>:<ciphertext>` (각 구간 base64)
 */
export function encryptField(plain: string): string {
  const key = readKey("FIELD_ENCRYPTION_KEY");
  const iv = crypto.randomBytes(12); // GCM 권장 길이
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(
    ":",
  );
}

/** encryptField 로 만든 값을 되돌린다. 변조됐으면 GCM 인증에서 예외가 난다. */
export function decryptField(encoded: string): string {
  const parts = encoded.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("암호문 형식이 올바르지 않습니다.");
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const key = readKey("FIELD_ENCRYPTION_KEY");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * 검색용 고정 해시. 같은 원문이면 항상 같은 값이라 UNIQUE 인덱스·WHERE 조건에 쓸 수 있다.
 * 원문 복원은 불가능하고, 키가 없으면 무차별 대입도 막힌다(DI 는 값 공간이 좁지 않지만
 * 그래도 단순 SHA-256 보다 HMAC 이 안전하다).
 */
export function blindIndex(plain: string): string {
  const key = readKey("FIELD_INDEX_KEY");
  return crypto.createHmac("sha256", key).update(plain, "utf8").digest("hex");
}

/** 값이 없을 수도 있는 필드용 헬퍼 — null/빈 문자열은 그대로 null 로 흘린다. */
export function encryptOptional(plain: string | null | undefined): string | null {
  return plain ? encryptField(plain) : null;
}

export function decryptOptional(encoded: string | null | undefined): string | null {
  return encoded ? decryptField(encoded) : null;
}

export function blindIndexOptional(plain: string | null | undefined): string | null {
  return plain ? blindIndex(plain) : null;
}
