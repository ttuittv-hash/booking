// 비즈메시지 발송 공통 타입 (기획서 B1).
//
// 채널을 추상화해 두는 이유: 알림톡은 템플릿 사전심사에 최대 16영업일이 걸린다.
// 심사를 기다리는 동안 인앱·이메일로 같은 이벤트를 흘려보내고, 승인이 나면
// 어댑터만 갈아끼운다. 발송 규칙(수신자 결정·변수 바인딩·멱등·재시도)은
// 채널과 무관하게 한 곳에 둔다.

export type MessageChannel = "INAPP" | "EMAIL" | "ALIMTALK" | "LMS";

export type SendStatus = "QUEUED" | "SENT" | "FAILED" | "FALLBACK";

/** 발송 실패 분류 (기획서 B5). 이 분류가 대체발송 여부를 가른다. */
export type FailureKind =
  /** 카카오 미가입·채널 차단·수신거부 → 문자로 대체발송 */
  | "UNREACHABLE"
  /** 템플릿·변수 오류 → 발송 중단, 개발 오류로 기록 */
  | "TEMPLATE"
  /** 일시 오류·타임아웃 → 재시도 */
  | "TRANSIENT"
  /** 문자 오류·결번 → 발송 중단, 운영자에게 표기 */
  | "INVALID_NUMBER"
  /** 이메일 주소 없음 → 발송 중단(이메일 채널 전용, 문자 대체발송 대상 아님) */
  | "INVALID_ADDRESS"
  /** 그 외 */
  | "UNKNOWN";

export interface SendRequest {
  /** 템플릿 코드 (MB-01 … NT-05) */
  templateCode: string;
  /** 렌더링된 본문 */
  body: string;
  /** 수신자 */
  recipient: {
    userId: string | null;
    phone: string | null;
    email: string | null;
    name: string | null;
  };
  /** 템플릿 변수 — 로그·재발송에 쓴다 */
  variables: Record<string, string>;
  /** 버튼(딥링크). 알림톡에서만 쓰이고 다른 채널은 본문 끝에 URL 로 붙인다. */
  button?: { name: string; url: string } | null;
}

export interface SendResult {
  ok: boolean;
  channel: MessageChannel;
  providerMessageId?: string | null;
  resultCode?: string | null;
  resultMessage?: string | null;
  failure?: FailureKind;
}

/** 채널 어댑터. 새 채널을 붙일 때 이 인터페이스만 구현하면 된다. */
export interface ChannelAdapter {
  channel: MessageChannel;
  /** 설정이 갖춰지지 않았으면 false — 파이프라인이 다음 채널로 넘어간다. */
  isConfigured(): boolean;
  send(request: SendRequest): Promise<SendResult>;
}
