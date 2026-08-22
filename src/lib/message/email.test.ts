import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const sendMail = vi.fn();
const createTransport = vi.fn();
createTransport.mockImplementation(() => ({ sendMail }));

vi.mock("nodemailer", () => ({
  default: { createTransport: (options: Record<string, unknown>) => createTransport(options) },
}));

const { emailAdapter, isEmailConfigured, resetEmailTransport } = await import("./email");

const ENV = {
  EMAIL_SMTP_HOST: "smtp.example.com",
  EMAIL_SMTP_PORT: "587",
  EMAIL_SMTP_USER: "user",
  EMAIL_SMTP_PASS: "pass",
  EMAIL_FROM_ADDRESS: "no-reply@seoularena.kr",
};

const request = {
  templateCode: "MB-06",
  body: "테스트기획사에서 초대했습니다.",
  recipient: { userId: null, phone: null, email: "invitee@example.com", name: null },
  variables: { __sendId: "send-1" },
  button: { name: "초대 확인하기", url: "https://seoularena.kr/invite?token=abc" },
};

beforeEach(() => {
  Object.assign(process.env, ENV);
  createTransport.mockClear();
  sendMail.mockReset();
  resetEmailTransport();
});
afterEach(() => {
  for (const k of Object.keys(ENV)) delete process.env[k as keyof typeof ENV];
  delete process.env.EMAIL_SMTP_SECURE;
  delete process.env.EMAIL_FROM_NAME;
  resetEmailTransport();
});

describe("설정 판정", () => {
  it("키가 다 있으면 이메일 채널이 켜진다", () => expect(isEmailConfigured()).toBe(true));
  it("발신 주소가 없으면 꺼진다", () => {
    delete process.env.EMAIL_FROM_ADDRESS;
    expect(isEmailConfigured()).toBe(false);
  });
});

describe("발송", () => {
  it("수신 이메일이 없으면 보내지 않는다", async () => {
    const result = await emailAdapter.send({ ...request, recipient: { ...request.recipient, email: null } });
    expect(result.ok).toBe(false);
    expect(result.failure).toBe("INVALID_ADDRESS");
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("템플릿 제목을 제목줄로, 버튼 링크를 본문 끝에 붙여 보낸다", async () => {
    sendMail.mockResolvedValue({ messageId: "M1" });
    const result = await emailAdapter.send(request);
    expect(result.ok).toBe(true);
    expect(result.providerMessageId).toBe("M1");
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "invitee@example.com",
        subject: "[서울아레나] 담당자 초대",
        text: expect.stringContaining("초대 확인하기 : https://seoularena.kr/invite?token=abc"),
      }),
    );
  });

  it("버튼이 없으면 본문을 그대로 보낸다", async () => {
    sendMail.mockResolvedValue({ messageId: "M2" });
    await emailAdapter.send({ ...request, button: undefined });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ text: request.body }));
  });

  it("465 포트면 secure를 명시하지 않아도 암시적 TLS로 접속한다", async () => {
    process.env.EMAIL_SMTP_PORT = "465";
    sendMail.mockResolvedValue({ messageId: "M3" });
    await emailAdapter.send(request);
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ secure: true }));
  });

  it("SMTP 오류는 일시 오류로 분류한다 — 반송은 비동기라 미리 알 수 없다", async () => {
    sendMail.mockRejectedValue(new Error("connect ECONNREFUSED"));
    const result = await emailAdapter.send(request);
    expect(result.ok).toBe(false);
    expect(result.failure).toBe("TRANSIENT");
    expect(result.resultMessage).toContain("ECONNREFUSED");
  });
});
