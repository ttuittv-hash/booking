"use client";
import editor from "./ContentEditor.module.css";
import { useContentTransport } from "./ContentTransport";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { HomeContent } from "@/lib/content/types";
import { DEFAULT_HOME_CONTENT } from "@/lib/content/seed";
import { btnClass } from "@/components/admin/adminButton";
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
import { Area, FileUpload } from "./fields";

/* 필드 구조는 브랜드 내러티브 스키마 그대로 두고 시각 토큰만 교체한다 */
const inputCls = FIELD;
const labelCls = FIELD_LABEL;
/** 입력칸 아래 안내 — 백오피스 전체가 같은 문구·같은 자리를 쓴다 */
const cardCls = CARD;
const addBtnCls = ADD_BTN;
const removeBtnCls = REMOVE_BTN;

export function HomeContentForm({ content: initial }: { content: HomeContent }) {
  const { request, isPreview } = useContentTransport();

  const [area, setArea] = useState<"hero" | "narrative" | "other">("hero");
  const router = useRouter();
  const [content, setContent] = useState<HomeContent>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
      const res = await request("/api/admin/notices/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) patch({ heroImage: data.url });
    } finally {
      setUploading(false);
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
      const res = await request("/api/admin/content/home", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "저장에 실패했습니다.");
        return;
      }
      setMessage(isPreview ? "예시 화면에 저장했습니다. 실제 공개 콘텐츠에는 반영되지 않습니다." : "저장되었습니다. 홈 화면에 바로 반영됩니다.");
      if (!isPreview) router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={editor.workspace}>
      <p className={editor.editingGuide}>텍스트 편집 안내: Enter는 줄바꿈, 빈 줄은 새 문단입니다. 굵게를 지원하는 본문은 **강조할 글자**처럼 별표 두 개로 감싸세요.</p>
      <header className={editor.header}>
        <div><h2>홈 페이지 편집</h2><p>왼쪽 구성도에서 영역을 선택하고, 오른쪽에서 내용을 수정하세요.</p></div>
        <a href="/" target="_blank" rel="noreferrer">공개 페이지 보기 ↗</a>
      </header>

      <div className={editor.layout}>
        <aside className={editor.map} aria-label="홈 페이지 구성도">
          <div className={editor.mapHeading}><strong>페이지 구성</strong><span>문구는 입력 즉시 반영 · 배치는 요약 표시</span></div>
          <button type="button" className={editor.previewBlock} aria-pressed={area === "hero"} onClick={() => setArea("hero")}>
            <span className={editor.location}>01 · 페이지 최상단</span>
            <strong className={editor.display}>{content.heroTitle || "영문 제목"}</strong>
            <span>{content.heroSubtitle || "국문 소개 문구"}</span>
            <span className={editor.previewActions}><b>{content.heroPrimaryLabel || "기본 버튼"}</b><b>{content.heroSecondaryLabel || "보조 버튼"}</b></span>
            <span className={editor.imagePlaceholder}>{content.heroImage ? "등록된 메인 이미지" : "메인 이미지 영역"}</span>
          </button>
          <button type="button" className={`${editor.previewBlock} ${editor.darkBlock}`} aria-pressed={area === "narrative"} onClick={() => setArea("narrative")}>
            <span className={editor.location}>02 · 메인 이미지 아래 / 브랜드 선언문</span>
            <strong className={editor.display}>{content.narrativeTitle || "브랜드 선언문 제목"}</strong>
            <span className={editor.excerpt}>{content.narrativeLead}</span>
            <span className={editor.statementCount}>선언문 {content.narrativeStatements.length}개 · 클릭하여 편집</span>
          </button>
          <button type="button" className={editor.previewBlock} aria-pressed={area === "other"} onClick={() => setArea("other")}>
            <span className={editor.location}>03 · 하단 안내 / 공통 영역</span>
            <strong>대관 안내 · 회원 상태별 버튼</strong><span>현재 편집 대상과 별도로 관리되는 영역</span>
          </button>
        </aside>
        <div className={editor.inspector}>
          <div className={editor.inspectorHeading}><span>홈 / {area === "hero" ? "01 상단 소개" : area === "narrative" ? "02 브랜드 선언문" : "03 기타 영역"}</span><strong>{area === "hero" ? "상단 소개 편집" : area === "narrative" ? "브랜드 선언문 편집" : "다른 영역의 관리 위치"}</strong></div>
      <section hidden={area !== "hero"}>
        <h3 className={SUB_TITLE}>히어로 (상단 이미지 + 카피 + 버튼)</h3>
        <Area label="영문 디스플레이" rows={2} value={content.heroTitle} onChange={(heroTitle) => patch({ heroTitle })} bold={false} paragraph={false} />
        <Area label="국문 리드" rows={3} value={content.heroSubtitle} onChange={(heroSubtitle) => patch({ heroSubtitle })} bold={false} paragraph={false} />
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
          {content.heroImage && (
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
          )}
            <FileUpload accept="image/*" disabled={uploading} onChange={uploadHeroImage} aria-label="배경 이미지 업로드" />
        </div>
      </section>

      <section hidden={area !== "narrative"}>
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
            <span className={labelCls}>상단 라벨 (저장 가능 · 현재 홈에는 미표시)</span>
            <input value={content.narrativeLabel} onChange={(e) => patch({ narrativeLabel: e.target.value })} className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>마무리 문구 (저장 가능 · 현재 홈에는 미표시)</span>
            <input value={content.narrativeClosing} onChange={(e) => patch({ narrativeClosing: e.target.value })} className={inputCls} />
          </label>
        </div>
        <Area label="제목" rows={2} value={content.narrativeTitle} onChange={(narrativeTitle) => patch({ narrativeTitle })} bold={false} paragraph={false} />
        <Area label="리드 문구" rows={5} value={content.narrativeLead} onChange={(narrativeLead) => patch({ narrativeLead })} bold={true} paragraph={true} />

        <div className="mt-4 space-y-3">
          {content.narrativeStatements.map((s, i) => (
            <div key={i} className={cardCls}>
              <div className="flex items-start justify-between gap-2">
                <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                  <label>
                    <span className={labelCls}>제목</span>
                    <input value={s.title} onChange={(e) => updateStatement(i, { title: e.target.value })} className={inputCls} />
                  </label>
                  <div className="sm:col-span-2"><Area label="본문" rows={4} value={s.desc} onChange={(desc) => updateStatement(i, { desc })} /></div>
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

      <section hidden={area !== "other"}>
        <h3 className={SUB_TITLE}>신청 절차</h3>
        <p className={`mt-3 ${HELP}`}>
          2026-08 정보구조 재구성으로 홈에서 신청 절차 섹션이 빠졌습니다. 절차의 정본은 대관
          안내(대관 절차 탭) 하나이며, 문구는{" "}
          <code className="font-bold">src/lib/content/processFacts.ts</code> 에서 관리합니다.
        </p>
      </section>

        </div>
      </div>
      <div className={editor.saveBar}><span>변경한 내용은 저장 후 공개 페이지에 반영됩니다.</span>
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
    </div>
  );
}
