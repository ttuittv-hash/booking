"use client";

// 본인인증 버튼 — 가입·아이디 찾기·비밀번호 찾기 세 화면이 함께 쓴다(기획서 A4).
// 세 곳에 같은 코드를 복사해 두면 인증 정책이 갈라진다.

import { useEffect, useRef, useState } from "react";
import { btnClass } from "@/components/ui/kit";

export function IdentityGate({
  purpose,
  label = "휴대폰 본인인증",
  onVerified,
}: {
  purpose: "REGISTER" | "FIND_ID" | "RESET_PASSWORD";
  label?: string;
  onVerified: (v: { ticket: string; name: string; mobileNo: string }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devBypass, setDevBypass] = useState(false);
  // 팝업을 그냥 닫으면 결과 메시지가 오지 않는다 — 감시하지 않으면 버튼이 영영 잠긴다.
  const awaitingAuth = useRef(false);

  useEffect(() => {
    fetch("/api/auth/nice/config")
      .then((r) => r.json())
      .then((d) => setDevBypass(d.devBypass === true))
      .catch(() => setDevBypass(false));
  }, []);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (!e.data || e.data.source !== "nice-auth") return;
      const p = e.data.payload || {};
      awaitingAuth.current = false;
      setLoading(false);
      if (!p.ok) {
        setError(p.message || "본인인증에 실패했습니다.");
        return;
      }
      setError(null);
      onVerified({ ticket: p.ticket, name: p.name, mobileNo: p.mobileNo });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onVerified]);

  async function start(options?: { bypass?: boolean }) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/nice/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose, devBypass: options?.bypass === true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "본인인증을 시작하지 못했습니다.");
      if (data.stub && data.ticket) {
        setLoading(false);
        onVerified({ ticket: data.ticket, name: data.name ?? "", mobileNo: data.mobileNo ?? "" });
        return;
      }
      awaitingAuth.current = true;
      const popup = window.open(
        data.authUrl,
        "niceAuth",
        "width=480,height=812,menubar=no,status=no,toolbar=no",
      );
      if (!popup) {
        awaitingAuth.current = false;
        setLoading(false);
        setError("팝업이 차단되었습니다. 브라우저 팝업 차단을 해제한 뒤 다시 시도해 주세요.");
        return;
      }
      const timer = window.setInterval(() => {
        if (!popup.closed) return;
        window.clearInterval(timer);
        if (!awaitingAuth.current) return;
        awaitingAuth.current = false;
        setLoading(false);
        setError("본인인증이 완료되지 않았습니다. 다시 시도해 주세요.");
      }, 700);
    } catch (e) {
      awaitingAuth.current = false;
      setLoading(false);
      setError(e instanceof Error ? e.message : "본인인증을 시작하지 못했습니다.");
    }
  }

  return (
    <div data-testid="identity-gate">
      <div className="border border-border-soft bg-surface px-6 py-8 text-center">
        <p className="text-h6-m font-bold">휴대폰</p>
        <p className="mt-2 text-s text-muted">본인 명의로 등록된 휴대폰 번호를 이용하여 본인확인</p>
        <button
          type="button"
          data-testid="identity-start"
          disabled={loading}
          onClick={() => start()}
          className={`${btnClass("primary", "md")} mt-6`}
        >
          {loading ? "인증창을 여는 중…" : label}
        </button>
      </div>
      {error ? (
        <p data-testid="identity-error" className="mt-3 break-keep text-s leading-6 text-danger">
          {error}
        </p>
      ) : null}
      {devBypass ? (
        <div className="mt-4 border border-warn/40 px-4 py-3">
          <p className="break-keep text-xs leading-6 text-warn">
            개발 환경에서만 보이는 버튼입니다. 인증을 건너뛰고 다음 단계로 넘어갑니다.
          </p>
          <button
            type="button"
            data-testid="identity-bypass"
            disabled={loading}
            onClick={() => start({ bypass: true })}
            className={`${btnClass("secondary", "sm")} mt-2.5 justify-center`}
          >
            인증 없이 다음 (개발용)
          </button>
        </div>
      ) : null}
    </div>
  );
}
