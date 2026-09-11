"use client";

// 대표자 뱃지 미공개 설정 — "회사 찾기" 레이어(2026-09-11, "특정 회사의 경우 대표자
// 뱃지를 미공개하는 설정 기능을... 회사 찾기해서 등록된 회사 리스트 레이어로 보여주고
// 거기서 선택하게"). RegisterWizard.tsx의 CompanySearchDialog(회원가입용, 승인 완료
// 회사만·마스킹)와 같은 오버레이 모양을 쓰되, 운영자 전용 검색(/api/admin/companies/search)
// 이라 승인 여부와 무관하게 전체 회사를 마스킹 없이 보여준다.
import { useState } from "react";
import { btnClass } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";

interface CompanyHit {
  id: string;
  name: string;
  businessRegistrationNumber: string | null;
  status: string;
  masterBadgeHidden: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "심사 중",
  APPROVED: "승인 완료",
  REJECTED: "미승인",
  SUSPENDED: "휴·폐업",
};

export function MasterBadgeVisibilityDialog({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  /** 설정·해제가 하나라도 반영되면 호출 — 호출부가 목록을 다시 읽는다. */
  onChanged: () => void;
}) {
  const toast = useToast();
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<CompanyHit[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function run() {
    if (keyword.trim().length < 2) {
      setMessage("2자 이상 입력해주세요.");
      setResults([]);
      return;
    }
    const res = await fetch(`/api/admin/companies/search?q=${encodeURIComponent(keyword.trim())}`);
    const data = await res.json();
    setResults(data.results ?? []);
    setMessage(data.results?.length ? null : "검색 결과가 없습니다.");
  }

  async function toggle(hit: CompanyHit) {
    setBusyId(hit.id);
    try {
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setMasterBadgeHidden",
          companyId: hit.id,
          hidden: !hit.masterBadgeHidden,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "변경하지 못했습니다.");
      setResults((prev) =>
        prev.map((r) => (r.id === hit.id ? { ...r, masterBadgeHidden: !hit.masterBadgeHidden } : r)),
      );
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "변경하지 못했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="대표자 뱃지 미공개 설정 — 회사 찾기"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-y-auto bg-background p-7 sm:p-9">
        <div className="flex items-center justify-between">
          <h3 className="text-h5-m font-bold sm:text-h5">대표자 뱃지 미공개 설정 — 회사 찾기</h3>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-muted">
            ✕
          </button>
        </div>
        <p className="mt-2 break-keep text-s leading-6 text-muted">
          설정하거나 해제할 회사를 검색해 주세요. 승인 여부와 무관하게 등록된 모든 회사가 대상입니다.
        </p>

        <div className="mt-4 flex gap-2">
          <input
            autoFocus
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void run();
            }}
            placeholder="회사명 또는 사업자등록번호"
            className="h-11 min-w-0 flex-1 border border-border-soft px-3 text-s sm:h-8"
          />
          <button
            type="button"
            onClick={() => void run()}
            className={`${btnClass("primary", "sm")} whitespace-nowrap`}
          >
            검색
          </button>
        </div>

        {message ? <p className="mt-4 break-keep text-s leading-6 text-muted">{message}</p> : null}

        <ul className="mt-5 space-y-2.5">
          {results.map((hit) => (
            <li
              key={hit.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-border-soft px-5 py-4"
            >
              <span className="break-keep text-s leading-6">
                <b>{hit.name}</b>
                <span className="ml-2 text-muted">
                  {hit.businessRegistrationNumber ?? "—"} · {STATUS_LABEL[hit.status] ?? hit.status}
                </span>
              </span>
              {hit.masterBadgeHidden ? (
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-muted">뱃지 비공개 설정됨</span>
                  <button
                    type="button"
                    disabled={busyId === hit.id}
                    onClick={() => void toggle(hit)}
                    className={btnClass("secondary", "sm")}
                  >
                    해제
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  disabled={busyId === hit.id}
                  onClick={() => void toggle(hit)}
                  className={btnClass("secondary", "sm")}
                >
                  선택
                </button>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-5 break-keep text-xs leading-6 text-muted">
          선택하면 즉시 적용됩니다 — 해당 회사의 목록·상세 화면에서 대표 담당자 뱃지가 보이지 않게 됩니다.
        </p>
      </div>
    </div>
  );
}
