// 인앱 알림 채널 — 모든 비즈메시지는 인앱에도 함께 남는다(기획서 1-62).
// 외부 발송이 전부 실패해도 최후의 전달 경로가 된다.

import crypto from "node:crypto";
import { createNotification } from "@/lib/db";
import type { ChannelAdapter, SendRequest, SendResult } from "./types";

export const inAppAdapter: ChannelAdapter = {
  channel: "INAPP",
  isConfigured: () => true,

  async send(request: SendRequest): Promise<SendResult> {
    if (!request.recipient.userId) {
      // 아직 계정이 없는 수신자(가입 전 안내 등)에게는 인앱이 성립하지 않는다.
      return { ok: false, channel: "INAPP", failure: "UNREACHABLE", resultMessage: "계정 없음" };
    }
    // 버튼은 본문에 URL 을 붙이지 않고 링크로 저장한다 — 알림을 누르면 바로 이동한다.
    await createNotification({
      id: crypto.randomUUID(),
      recipientId: request.recipient.userId,
      // 비즈메시지는 신청서에 매인 알림이 아니다.
      quoteId: null,
      link: request.button?.url ?? null,
      message: request.body,
      createdAt: new Date().toISOString(),
    });
    return { ok: true, channel: "INAPP", resultCode: "OK" };
  },
};
