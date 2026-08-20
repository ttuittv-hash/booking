// 본인인증 완료 사실을 가입 API 까지 넘기는 짧은 티켓.
//
// 인증 결과(CI/DI·이름·휴대폰)를 클라이언트에 그대로 내려주면 그 값을 손대서
// 다시 올릴 수 있다. 그래서 서버는 서명된 티켓만 주고, 가입 API 가 티켓을 받아
// 서버 쪽 인증 이력(identity_verifications)을 다시 읽는다.
//
// 세션 쿠키와 같은 AUTH_SECRET 으로 서명하되 용도(aud)를 나눠, 세션 토큰이
// 인증 티켓으로 오인되지 않게 한다.

import { SignJWT, jwtVerify } from "jose";

const AUDIENCE = "identity-ticket";
/** 인증 직후 곧바로 가입을 이어가는 흐름이라 짧게 잡는다. */
const TTL_SECONDS = 10 * 60;

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET 이 설정되지 않았습니다.");
  return new TextEncoder().encode(value);
}

export interface IdentityTicketPayload {
  verificationId: string;
  purpose: string;
  name: string;
  mobileNo: string;
}

export async function signIdentityTicket(payload: IdentityTicketPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifyIdentityTicket(
  token: string,
): Promise<IdentityTicketPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { audience: AUDIENCE });
    if (typeof payload.verificationId !== "string") return null;
    return {
      verificationId: payload.verificationId,
      purpose: typeof payload.purpose === "string" ? payload.purpose : "REGISTER",
      name: typeof payload.name === "string" ? payload.name : "",
      mobileNo: typeof payload.mobileNo === "string" ? payload.mobileNo : "",
    };
  } catch {
    return null;
  }
}
