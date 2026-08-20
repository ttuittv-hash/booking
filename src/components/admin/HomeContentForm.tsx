"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { HomeContent } from "@/lib/content/types";
import { DEFAULT_HOME_CONTENT } from "@/lib/content/seed";
import { btnClass } from "@/components/ui/kit";
import {
  ADD_BTN,
  CARD,
  FIELD,
  FIELD_LABEL,
  HELP,
  OK_NOTE,
  REMOVE_BTN,
  SUB_TITLE,
} from "./adminUi";

/* 필드 구조는 브랜드 내러티브 스키마 그대로 두고 시각 토큰만 교체한다 */
const inputCls = FIELD;
const labelCls = FIELD_LABEL;
const cardCls = CARD;
const addBtnCls = ADD_BTN;
const removeBtnCls = REMOVE_BTN;

export function HomeContentForm({ content: initial }: { content: HomeContent }) {
  const router = useRouter();
  const [content, setContent] = useState<HomeContent>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUploading, setImageUploading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function patch(p: Partial<HomeContent>) {
    setContent((prev) => ({ ...prev, ...p }));
  }

  async function uploadHeroImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/notices/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) patch({ heroImage: data.url });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function uploadSingleImage(
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
    onDone: (url: string) => void,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(key);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/notices/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) onDone(data.url);
    } finally {
      setImageUploading(null);
      e.target.value = "";
    }
  }

  function updateStatement(i: number, patchS: Partial<HomeContent["narrativeStatements"][number]>) {
    patch({
      narrativeStatements: content.narrativeStatements.map((s, j) =>
        j === i ? { ...s, ...patchS } : s,
      ),
    });
  }
  function addStatement() {
    patch({
      narrativeStatements: [
        ...content.narrativeStatements,
        { title: "", desc: "" },
      ],
    });
  }
  function removeStatement(i: number) {
    patch({ narrativeStatements: content.narrativeStatements.filter((_, j) => j !== i) });
  }

  /** 스키마가 개정되어 저장된 구버전 데이터에 신규 항목이 없을 때 대응 */
  function loadDefaults() {
    patch({
      heroTitle: DEFAULT_HOME_CONTENT.heroTitle,
      heroSubtitle: DEFAULT_HOME_CONTENT.heroSubtitle,
      heroPrimaryLabel: DEFAULT_HOME_CONTENT.heroPrimaryLabel,
      heroPrimaryHref: DEFAULT_HOME_CONTENT.heroPrimaryHref,
      heroSecondaryLabel: DEFAULT_HOME_CONTENT.heroSecondaryLabel,
      heroSecondaryHref: DEFAULT_HOME_CONTENT.heroSecondaryHref,
      narrativeLabel: DEFAULT_HOME_CONTENT.narrativeLabel,
      narrativeTitle: DEFAULT_HOME_CONTENT.narrativeTitle,
      narrativeLead: DEFAULT_HOME_CONTENT.narrativeLead,
      narrativeStatements: DEFAULT_HOME_CONTENT.narrativeStatements.map((s) => ({ ...s })),
      narrativeClosing: DEFAULT_HOME_CONTENT.narrativeClosing,
    });
    setMessage("브랜드 내러티브 기본값을 불러왔습니다. 확인 후 저장하세요.");
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/content/home", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "저장에 실패했습니다.");
        return;
      }
      setMessage("저장되었습니다. 홈 화면에 바로 반영됩니다.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className={SUB_TITLE}>히어로 (상단 이미지 + 카피 + 버튼)</h3>
        <label className="mt-3 block">
          <span className={labelCls}>영문 디스플레이 (줄바꿈 가능)</span>
          <textarea rows={2} value={content.heroTitle} onChange={(e) => patch({ heroTitle: e.target.value })} className={inputCls} />
        </label>
        <label className="mt-3 block">
          <span className={labelCls}>국문 리드 (줄바꿈 가능)</span>
          <textarea rows={3} value={content.heroSubtitle} onChange={(e) => patch({ heroSubtitle: e.target.value })} className={inputCls} />
        </label>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label>
            <span className={labelCls}>기본 버튼 텍스트</span>
            <input value={content.heroPrimaryLabel} onChange={(e) => patch({ heroPrimaryLabel: e.target.value })} className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>기본 버튼 링크</span>
            <input value={content.heroPrimaryHref} onChange={(e) => patch({ heroPrimaryHref: e.target.value })} className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>보조 버튼 텍스트</span>
            <input value={content.heroSecondaryLabel} onChange={(e) => patch({ heroSecondaryLabel: e.target.value })} className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>보조 버튼 링크</span>
            <input value={content.heroSecondaryHref} onChange={(e) => patch({ heroSecondaryHref: e.target.value })} className={inputCls} />
          </label>
        </div>

        <div className="mt-4">
          <span className={labelCls}>배경 이미지 (카피·버튼 아래에 표시, 선택)</span>
          {content.heroImage ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={content.heroImage}
                alt="히어로 배경"
                className="h-24 w-40 border border-border-soft object-cover"
              />
              <button type="button" onClick={() => patch({ heroImage: null })} className={removeBtnCls}>
                이미지 삭제
              </button>
            </div>
          ) : (
            <label className="inline-block">
              <span className={addBtnCls}>{uploading ? "업로드 중..." : "+ 이미지 업로드"}</span>
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={uploadHeroImage}
                className="hidden"
              />
            </label>
          )}
        </div>
      </section>

      <section className="border-t border-border/15 pt-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className={SUB_TITLE}>브랜드 내러티브 (HOST IT. 선언문)</h3>
          <button type="button" onClick={loadDefaults} className={addBtnCls}>
            최신 기본값 불러오기
          </button>
        </div>
        <p className={`mt-2 ${HELP}`}>
          카카오 브랜드 가이드라인 3.4 &ldquo;브랜드 선언문: BUSINESS&rdquo;를 기준으로 작성합니다. 각 진술은
          이를 뒷받침하는 제원·안내 페이지로 연결됩니다.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label>
            <span className={labelCls}>상단 라벨 (예: Manifesto)</span>
            <input value={content.narrativeLabel} onChange={(e) => patch({ narrativeLabel: e.target.value })} className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>마무리 문구 (예: LIVE MOMENTS, LIVE PLATFORM)</span>
            <input value={content.narrativeClosing} onChange={(e) => patch({ narrativeClosing: e.target.value })} className={inputCls} />
          </label>
        </div>
        <label className="mt-3 block">
          <span className={labelCls}>제목 (줄바꿈 가능)</span>
          <textarea rows={2} value={content.narrativeTitle} onChange={(e) => patch({ narrativeTitle: e.target.value })} className={inputCls} />
        </label>
        <label className="mt-3 block">
          <span className={labelCls}>리드 문구</span>
          <textarea rows={2} value={content.narrativeLead} onChange={(e) => patch({ narrativeLead: e.target.value })} className={inputCls} />
        </label>

        <div className="mt-4 space-y-3">
          {content.narrativeStatements.map((s, i) => (
            <div key={i} className={cardCls}>
              <div className="flex items-start justify-between gap-2">
                <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                  <label>
                    <span className={labelCls}>제목</span>
                    <input value={s.title} onChange={(e) => updateStatement(i, { title: e.target.value })} className={inputCls} />
                  </label>
                  <label className="sm:col-span-2">
                    <span className={labelCls}>본문</span>
                    <textarea rows={2} value={s.desc} onChange={(e) => updateStatement(i, { desc: e.target.value })} className={inputCls} />
                  </label>
                </div>
                <button type="button" onClick={() => removeStatement(i)} className={removeBtnCls}>
                  삭제
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addStatement} className={addBtnCls}>
            + 내러티브 진술 추가
          </button>
        </div>
      </section>

      <section className="border-t border-border/15 pt-7">
        <h3 className={SUB_TITLE}>신청 절차</h3>
        <p className={`mt-3 ${HELP}`}>
          2026-08 정보구조 재구성으로 홈에서 신청 절차 섹션이 빠졌습니다. 절차의 정본은 대관
          안내(대관 절차 탭) 하나이며, 문구는{" "}
          <code className="font-bold">src/lib/content/processFacts.ts</code> 에서 관리합니다.
        </p>
      </section>

      {message && <p className={OK_NOTE}>{message}</p>}
      <button
        type="button"
        disabled={saving}
        onClick={save}
        className={btnClass("primary", "md")}
      >
        {saving ? "저장 중..." : "저장"}
      </button>
    </div>
  );
}
