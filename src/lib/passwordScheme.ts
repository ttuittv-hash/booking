import crypto from "node:crypto";

// 비밀번호 이중 해시 스킴(v2):
//  1) 클라이언트가 비밀번호를 SHA-256으로 해시해서 전송한다 (평문이 네트워크·서버 로그에
//     남지 않도록 하는 전송 단계 보호 — TLS(HTTPS) 암호화에 더해지는 추가 방어).
//  2) 서버는 받은 해시를 bcrypt로 다시 해시해서 DB에 저장한다 (유출 시 원문 복원 불가).
// 검증: bcrypt.compare(sha256hex(비밀번호), 저장된 해시)
export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

// 클라이언트가 보내는 전송용 해시의 형식 (SHA-256 hex, 소문자 64자)
export const SHA256_HEX_RE = /^[a-f0-9]{64}$/;
