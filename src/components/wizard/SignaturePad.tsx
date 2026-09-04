"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePadLib from "signature_pad";
import { btnClass } from "@/components/ui/kit";

// 안전관리 서약서 서명 캔버스 — signature_pad(순수 클라이언트 라이브러리, 외부 벤더·
// 계약·API 키 없이 npm 패키지 하나로 동작)로 마우스·터치 서명을 받아 PNG data URL로
// 저장한다(2026-08-24, "캔버스 서명패드로 해줘봐" — 벤더 연동 없이 구현). data URL은
// SafetyPledge.signature(string) 필드에 그대로 담기므로 DB 스키마 변경이 필요 없다.
export function SignaturePad({
  value,
  onChange,
  watermarkText,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  /** [신규 2026-08-26] 대관신청사명을 서명란에 옅게 깔아 따라 쓸 수 있게 한다
      ("서명란은 워터마크처럼... 대관신청사명이 써저있어야 한다"). 캔버스는 투명
      배경으로 그려 밑에 깔린 워터마크가 비치게 하고, 흰 배경은 감싸는 div가 진다. */
  watermarkText?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const [isEmpty, setIsEmpty] = useState(!value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pad = new SignaturePadLib(canvas, { backgroundColor: "rgba(0,0,0,0)" });
    padRef.current = pad;

    // 캔버스는 리사이즈(브라우저 폭 변경 등) 시 픽셀 버퍼가 지워지므로, 그리기 전에
    // 기존 내용(이미 그린 서명 또는 저장된 value)을 data URL로 보관했다가 다시 그린다.
    function resize() {
      if (!canvas) return;
      const preserved = pad.isEmpty() ? value || null : pad.toDataURL("image/png");
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);
      pad.clear();
      if (preserved) void pad.fromDataURL(preserved, { width, height });
    }

    resize();
    window.addEventListener("resize", resize);

    function handleEnd() {
      const empty = pad.isEmpty();
      setIsEmpty(empty);
      onChange(empty ? "" : pad.toDataURL("image/png"));
    }
    pad.addEventListener("endStroke", handleEnd);

    return () => {
      window.removeEventListener("resize", resize);
      pad.removeEventListener("endStroke", handleEnd);
      pad.off();
    };
    // 마운트 시 1회만 초기화한다 — value 는 최초 렌더 복원용으로만 쓰고, 이후 매
    // onChange 마다 재구독하면 그리는 도중 리스너가 재설치돼 스트로크가 끊긴다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clear() {
    padRef.current?.clear();
    setIsEmpty(true);
    onChange("");
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-surface border border-border bg-white">
        {watermarkText && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center break-keep px-4 text-center text-h5-m font-bold text-foreground/10 select-none"
          >
            {watermarkText}
          </span>
        )}
        <canvas ref={canvasRef} className="relative block h-48 w-full touch-none" />
        {isEmpty && !watermarkText && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-s text-muted">
            이 영역에 마우스나 손가락으로 서명해 주세요
          </span>
        )}
      </div>
      <button type="button" onClick={clear} className={`${btnClass("secondary", "sm")} mt-2`}>
        지우기
      </button>
    </div>
  );
}
