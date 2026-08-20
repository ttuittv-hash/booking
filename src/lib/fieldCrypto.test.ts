import { describe, it, expect, beforeAll } from "vitest";
import crypto from "node:crypto";
import {
  encryptField,
  decryptField,
  blindIndex,
  encryptOptional,
  decryptOptional,
  blindIndexOptional,
  isFieldCryptoConfigured,
} from "./fieldCrypto";

beforeAll(() => {
  process.env.FIELD_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
  process.env.FIELD_INDEX_KEY = crypto.randomBytes(32).toString("base64");
});

const DI = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ==";

describe("fieldCrypto", () => {
  it("암호화한 값을 그대로 복호화한다", () => {
    expect(decryptField(encryptField(DI))).toBe(DI);
  });

  it("같은 원문이라도 암호문은 매번 달라진다 (IV 랜덤)", () => {
    expect(encryptField(DI)).not.toBe(encryptField(DI));
  });

  it("암호문에 원문이 남지 않는다", () => {
    expect(encryptField(DI)).not.toContain(DI);
  });

  it("변조된 암호문은 복호화에 실패한다 (GCM 인증)", () => {
    const enc = encryptField(DI);
    const parts = enc.split(":");
    const data = Buffer.from(parts[3], "base64");
    data[0] ^= 0xff; // 한 바이트만 뒤집는다
    parts[3] = data.toString("base64");
    expect(() => decryptField(parts.join(":"))).toThrow();
  });

  it("형식이 어긋나면 거부한다", () => {
    expect(() => decryptField("아무거나")).toThrow();
    expect(() => decryptField("v9:a:b:c")).toThrow();
  });

  it("블라인드 인덱스는 같은 원문에 대해 항상 같다", () => {
    expect(blindIndex(DI)).toBe(blindIndex(DI));
  });

  it("블라인드 인덱스는 다른 원문에 대해 다르다", () => {
    expect(blindIndex(DI)).not.toBe(blindIndex(DI + "x"));
  });

  it("블라인드 인덱스에 원문이 남지 않는다", () => {
    expect(blindIndex(DI)).not.toContain(DI);
    expect(blindIndex(DI)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("암호화 키와 인덱스 키가 서로 다른 결과를 낸다", () => {
    expect(blindIndex(DI)).not.toBe(encryptField(DI));
  });

  it("null·빈 값은 그대로 null 로 흘린다", () => {
    expect(encryptOptional(null)).toBeNull();
    expect(encryptOptional("")).toBeNull();
    expect(decryptOptional(null)).toBeNull();
    expect(blindIndexOptional(undefined)).toBeNull();
    const enc = encryptOptional(DI);
    expect(decryptOptional(enc)).toBe(DI);
  });

  it("키가 없으면 설정되지 않은 것으로 본다", () => {
    const saved = process.env.FIELD_ENCRYPTION_KEY;
    delete process.env.FIELD_ENCRYPTION_KEY;
    expect(isFieldCryptoConfigured()).toBe(false);
    expect(() => encryptField(DI)).toThrow(/FIELD_ENCRYPTION_KEY/);
    process.env.FIELD_ENCRYPTION_KEY = saved;
    expect(isFieldCryptoConfigured()).toBe(true);
  });

  it("키 길이가 32바이트가 아니면 거부한다", () => {
    const saved = process.env.FIELD_ENCRYPTION_KEY;
    process.env.FIELD_ENCRYPTION_KEY = crypto.randomBytes(16).toString("hex");
    expect(() => encryptField(DI)).toThrow(/32바이트/);
    process.env.FIELD_ENCRYPTION_KEY = saved;
  });

  it("한글·이모지도 왕복한다", () => {
    const s = "홍길동 010-1234-5678 🎫";
    expect(decryptField(encryptField(s))).toBe(s);
  });
});
