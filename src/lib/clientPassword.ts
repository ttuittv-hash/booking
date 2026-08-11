// 브라우저에서 비밀번호를 전송하기 전에 SHA-256으로 해시한다.
// 서버는 이 해시를 bcrypt로 한 번 더 감싸 DB에 저장한다 (src/lib/passwordScheme.ts 참고).
// crypto.subtle은 보안 컨텍스트(HTTPS 또는 localhost)에서만 동작한다.
export async function hashPasswordForTransport(password: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("이 브라우저 환경에서는 보안 로그인을 사용할 수 없습니다. HTTPS로 접속해주세요.");
  }
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
