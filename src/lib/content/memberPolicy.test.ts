import { describe, expect, it } from "vitest";
import {
  DEFAULT_MEMBER_POLICY,
  canAutoApproveInvite,
  normalizeMemberPolicy,
} from "./memberPolicy";

describe("초대 가입 승인 정책", () => {
  it("기본은 지금 동작 그대로 — 초대받은 사람은 바로 승인된다", () => {
    expect(DEFAULT_MEMBER_POLICY).toEqual({ inviteNeedsAdminApproval: false });
    expect(canAutoApproveInvite(true, DEFAULT_MEMBER_POLICY)).toBe(true);
  });

  it("켜면 초대로 들어와도 승인 대기로 남는다", () => {
    expect(canAutoApproveInvite(true, { inviteNeedsAdminApproval: true })).toBe(false);
  });

  it("초대장이 확인되지 않은 가입은 정책과 무관하게 승인 대기다", () => {
    expect(canAutoApproveInvite(false, { inviteNeedsAdminApproval: false })).toBe(false);
    expect(canAutoApproveInvite(false, { inviteNeedsAdminApproval: true })).toBe(false);
  });

  it("저장 요청에 이상한 값이 오면 꺼진 상태로 본다 — 실수로 승인이 열리면 안 된다", () => {
    expect(normalizeMemberPolicy(null)).toEqual({ inviteNeedsAdminApproval: false });
    expect(normalizeMemberPolicy({})).toEqual({ inviteNeedsAdminApproval: false });
    expect(normalizeMemberPolicy({ inviteNeedsAdminApproval: "true" })).toEqual({
      inviteNeedsAdminApproval: false,
    });
    expect(normalizeMemberPolicy({ inviteNeedsAdminApproval: true })).toEqual({
      inviteNeedsAdminApproval: true,
    });
  });
});
