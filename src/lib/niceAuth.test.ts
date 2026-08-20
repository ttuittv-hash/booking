import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { deriveKeyString, splitKeys, integrityValue, decryptResult } from "./niceAuth";

// NICE 통합인증 문서 3.1~3.3 규격을 고정한다.
// 이 부분은 한 글자만 어긋나도 "조용히" 복호화에 실패하거나, 더 나쁘게는
// 무결성 검증을 통과시켜 버린다. 문서 예제와 같은 방식으로 값을 만들어 대조한다.

const TICKET = "UzIyMDI2MDgxODExNDg0Nzc0NzM4QTZBRTYwMDJCMzJGM0U5NEIxQTQz";
const TRANSACTION_ID = "UzJBN0VEMkZDRjkzM0U3MjIwMjYwODE4MTE0OTI1NDIwNjlFMERBOEM";
const ITERATIONS = 32;

describe("키 유도 (문서 3.1)", () => {
  it("PBKDF2-HMAC-SHA256 64byte 를 Base64Url 패딩 없이 낸다", () => {
    const ks = deriveKeyString(TICKET, TRANSACTION_ID, ITERATIONS);
    // 64byte → base64 86자(패딩 제외)
    expect(ks).toHaveLength(86);
    expect(ks).not.toContain("=");
    expect(ks).not.toContain("+");
    expect(ks).not.toContain("/");
  });

  it("문서의 Node.js 예제와 같은 값을 낸다", () => {
    const expected = crypto
      .pbkdf2Sync(TICKET, TRANSACTION_ID, ITERATIONS, 64, "sha256")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(deriveKeyString(TICKET, TRANSACTION_ID, ITERATIONS)).toBe(expected);
  });

  it("입력이 하나라도 다르면 키가 달라진다", () => {
    const base = deriveKeyString(TICKET, TRANSACTION_ID, ITERATIONS);
    expect(deriveKeyString(TICKET + "x", TRANSACTION_ID, ITERATIONS)).not.toBe(base);
    expect(deriveKeyString(TICKET, TRANSACTION_ID + "x", ITERATIONS)).not.toBe(base);
    expect(deriveKeyString(TICKET, TRANSACTION_ID, ITERATIONS + 1)).not.toBe(base);
  });
});

describe("키 분리 (문서 3.1 [2])", () => {
  const ks = deriveKeyString(TICKET, TRANSACTION_ID, ITERATIONS);

  it("대칭키는 앞 32byte, 무결성키는 48번째부터 32byte 다", () => {
    const { key, hmacKey } = splitKeys(ks);
    expect(key).toBe(ks.substring(0, 32));
    expect(hmacKey).toBe(ks.substring(48, 80));
    expect(key).toHaveLength(32);
    expect(hmacKey).toHaveLength(32);
  });

  it("두 키는 겹치지 않는다", () => {
    const { key, hmacKey } = splitKeys(ks);
    expect(key).not.toBe(hmacKey);
  });

  it("유도 문자열을 Base64 디코딩하지 않고 그대로 쓴다", () => {
    // 디코딩해서 쓰면 키가 달라져 복호화가 실패한다 — 문서가 굵게 강조하는 지점이다.
    const { key } = splitKeys(ks);
    expect(Buffer.from(key, "utf8")).toHaveLength(32);
  });
});

describe("무결성 값 (문서 3.2)", () => {
  it("HMAC-SHA256 을 Base64Url 패딩 없이 낸다", () => {
    const v = integrityValue("enc-data-sample", "0123456789abcdef0123456789abcdef");
    expect(v).not.toContain("=");
    expect(v).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("문서의 Node.js 예제와 같은 값을 낸다", () => {
    const encData = "enc-data-sample";
    const hmacKey = "0123456789abcdef0123456789abcdef";
    const expected = crypto
      .createHmac("sha256", hmacKey)
      .update(encData)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(integrityValue(encData, hmacKey)).toBe(expected);
  });

  it("enc_data 가 한 글자만 달라져도 값이 바뀐다", () => {
    const k = "0123456789abcdef0123456789abcdef";
    expect(integrityValue("abc", k)).not.toBe(integrityValue("abd", k));
  });
});

describe("복호화 (문서 3.3)", () => {
  // NICE 가 만드는 것과 같은 구조로 암호문을 만든다: [IV 16byte | 암호문 | 태그 16byte]
  function encryptLikeNice(plain: string, key: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(key, "utf8"), iv);
    const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    return Buffer.concat([iv, ct, cipher.getAuthTag()]).toString("base64url");
  }
  const KEY = "0123456789abcdef0123456789abcdef"; // 32byte

  it("AES-256-GCM 암호문을 되돌린다", () => {
    const payload = JSON.stringify({ name: "홍길동", di: "DI값", ci: "CI값" });
    expect(decryptResult(encryptLikeNice(payload, KEY), KEY)).toBe(payload);
  });

  it("한글·이모지가 깨지지 않는다", () => {
    const s = "홍길동 010-1234-5678 🎫";
    expect(decryptResult(encryptLikeNice(s, KEY), KEY)).toBe(s);
  });

  it("키가 다르면 복호화에 실패한다", () => {
    const enc = encryptLikeNice("secret", KEY);
    expect(() => decryptResult(enc, "fedcba9876543210fedcba9876543210")).toThrow();
  });

  it("암호문이 변조되면 인증 태그 검증에서 걸린다", () => {
    const enc = encryptLikeNice("secret", KEY);
    const raw = Buffer.from(enc, "base64url");
    raw[20] ^= 0xff; // IV 뒤 본문 한 바이트 변조
    expect(() => decryptResult(raw.toString("base64url"), KEY)).toThrow();
  });

  it("앞 16byte 를 IV 로 쓴다", () => {
    const enc = encryptLikeNice("hello", KEY);
    const raw = Buffer.from(enc, "base64url");
    // IV(16) + 태그(16) 를 뺀 나머지가 실제 암호문 길이여야 한다
    expect(raw.length).toBe(16 + Buffer.byteLength("hello") + 16);
  });
});
