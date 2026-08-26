import { describe, expect, it } from "vitest";
import { mapPolledStatus } from "./reconcile";

describe("폴링 결과 → 이력 상태", () => {
  it("API_200 만 성공이다", () => {
    expect(mapPolledStatus({ cid: "a", uid: null, stateCode: "API_200", message: null }).status).toBe("SENT");
    expect(mapPolledStatus({ cid: "a", uid: null, stateCode: "200", message: null }).status).toBe("SENT");
  });
  it("그 외(발신프로필 비활성 등)는 실패로 남기고 사유를 보존한다", () => {
    const m = mapPolledStatus({ cid: "a", uid: null, stateCode: "API_521", message: "DeactivatedProfile(x)" });
    expect(m).toEqual({ status: "FAILED", code: "API_521", message: "DeactivatedProfile(x)" });
  });
});
