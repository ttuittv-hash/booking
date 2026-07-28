"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { won } from "@/lib/format";
import { listQuoteSnapshots } from "@/lib/quotesStore";
import type { Quote } from "@/lib/pricing/types";

const STATUS_LABEL: Record<Quote["status"], string> = {
  ESTIMATE: "예상견적 (심사 대기)",
  CONTRACTED: "계약 확정",
  SETTLED: "정산 완료",
};

export default function AdminPage() {
  const [applications, setApplications] = useState<Quote[]>([]);

  useEffect(() => {
    // localStorage는 리액트 외부 저장소이므로 마운트 시 1회 동기화한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApplications(listQuoteSnapshots());
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <Link href="/" className="text-[15px] font-semibold tracking-tight">
            SEOUL ARENA
          </Link>
          <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted">
            운영자 백오피스
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <h1 className="text-[22px] font-semibold">신청 현황</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-6 text-muted">
          이 화면은 1단계 구현으로, 이 브라우저에 저장된 신청 스냅샷만
          보여줍니다. 로그인/권한 분리, 심사·계약 조정, 정산 화면은 다음
          단계에서 서버(DB) 연동과 함께 구현됩니다.
        </p>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border bg-panel text-left text-[11.5px] font-medium text-muted">
                <th className="px-4 py-3">신청번호</th>
                <th className="px-4 py-3">신청일시</th>
                <th className="px-4 py-3">주차</th>
                <th className="px-4 py-3">관객</th>
                <th className="px-4 py-3 text-right">신청 예상금액</th>
                <th className="px-4 py-3">상태</th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    아직 저장된 신청서가 없습니다.{" "}
                    <Link href="/apply" className="text-accent hover:underline">
                      견적 산출 시작하기
                    </Link>
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="border-b border-border/70">
                    <td className="px-4 py-3 font-medium">{app.id}</td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(app.createdAt).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-4 py-3">
                      {app.selection.week.year}.{app.selection.week.month}{" "}
                      {app.selection.week.weekOfMonth}주차
                    </td>
                    <td className="px-4 py-3">
                      {app.selection.expectedAudience.toLocaleString()}명
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {won(app.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11.5px] font-medium text-accent">
                        {STATUS_LABEL[app.status]}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
