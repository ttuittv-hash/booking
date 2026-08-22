// 이메일 채널 — SMTP 릴레이.
//
// 알림톡 사전심사(최대 16영업일)를 기다리는 동안 인앱·이메일로 같은 이벤트를
// 흘려보낸다는 게 애초 설계다(types.ts 상단 주석). 발송대행사 REST API 대신
// SMTP를 쓰는 이유: 어떤 이메일 공급자든(사내 메일서버·Gmail·SES·SendGrid 등)
// SMTP 릴레이는 대부분 지원해서, 나중에 실제 공급자가 정해져도 이 어댑터를
// 갈아끼울 필요 없이 접속 정보만 바꾸면 된다.
//
// 키를 아직 못 받았다. isConfigured() 가 false 면 파이프라인이 이 채널을 건너뛴다
// (kakaoBizTalk.ts와 같은 패턴).

import nodemailer from "nodemailer";
import type { ChannelAdapter, SendRequest, SendResult } from "./types";
import { findTemplate } from "./templates";

let cachedTransport: ReturnType<typeof nodemailer.createTransport> | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.EMAIL_SMTP_HOST &&
      process.env.EMAIL_SMTP_PORT &&
      process.env.EMAIL_SMTP_USER &&
      process.env.EMAIL_SMTP_PASS &&
      process.env.EMAIL_FROM_ADDRESS,
  );
}

/** 테스트에서 재설정할 수 있게 별도 함수로 뺀다 — env를 바꿔도 이전 접속 정보가 캐시로 남으면 안 된다. */
export function resetEmailTransport(): void {
  cachedTransport = null;
}

function transport() {
  if (cachedTransport) return cachedTransport;
  cachedTransport = nodemailer.createTransport({
    host: process.env.EMAIL_SMTP_HOST,
    port: Number(process.env.EMAIL_SMTP_PORT),
    // 465는 관행적으로 암시적 TLS(SMTPS)를 쓴다. 587/25는 STARTTLS라 secure:false로 접속한
    // 뒤 nodemailer가 알아서 업그레이드한다 — EMAIL_SMTP_SECURE로 명시하지 않으면 포트로 추정한다.
    secure: process.env.EMAIL_SMTP_SECURE
      ? process.env.EMAIL_SMTP_SECURE === "true"
      : process.env.EMAIL_SMTP_PORT === "465",
    auth: { user: process.env.EMAIL_SMTP_USER, pass: process.env.EMAIL_SMTP_PASS },
  });
  return cachedTransport;
}

// 알림톡은 버튼이 딥링크 UI로 따로 뜨지만, 이메일은 본문 텍스트 안에 링크를 넣는
// 수밖에 없다 — 없으면 "확인하기" 버튼 자체가 통째로 사라진다.
function buildBody(request: SendRequest): string {
  if (!request.button) return request.body;
  return `${request.body}\n\n${request.button.name} : ${request.button.url}`;
}

function subjectFor(templateCode: string): string {
  const title = findTemplate(templateCode)?.title ?? templateCode;
  return `[서울아레나] ${title}`;
}

export const emailAdapter: ChannelAdapter = {
  channel: "EMAIL",
  isConfigured: isEmailConfigured,

  async send(request: SendRequest): Promise<SendResult> {
    if (!request.recipient.email) {
      return { ok: false, channel: "EMAIL", failure: "INVALID_ADDRESS", resultMessage: "수신 이메일 없음" };
    }
    const fromAddress = process.env.EMAIL_FROM_ADDRESS as string;
    const fromName = process.env.EMAIL_FROM_NAME || "서울아레나";
    try {
      const info = await transport().sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: request.recipient.email,
        subject: subjectFor(request.templateCode),
        text: buildBody(request),
      });
      return { ok: true, channel: "EMAIL", providerMessageId: info.messageId, resultCode: "OK" };
    } catch (error) {
      // SMTP 연결·인증 오류는 전부 일시 오류로 본다 — 주소 자체가 틀렸는지는
      // 우리가 미리 판단할 수 없고(반송은 비동기로 나중에 온다), 재시도가 맞는 기본값이다.
      return {
        ok: false,
        channel: "EMAIL",
        failure: "TRANSIENT",
        resultMessage: error instanceof Error ? error.message : "이메일 발송 실패",
      };
    }
  },
};
