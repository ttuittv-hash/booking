"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { GuideContent, GuideStep } from "@/lib/content/types";
import { GuideContentView } from "@/components/GuideContentView";
import { btnClass } from "@/components/ui/kit";
import { NoticeEditor } from "./NoticeEditor";
import { ADD_BTN, CARD, FIELD, FIELD_LABEL, HELP, OK_NOTE, REMOVE_BTN, SUB_TITLE } from "./adminUi";

const inputCls = FIELD;
const labelCls = FIELD_LABEL;
const cardCls = CARD;
const removeBtnCls = REMOVE_BTN;
const addBtnCls = ADD_BTN;

function TextListEditor({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => onChange(items.map((v, j) => (j === i ? e.target.value : v)))}
            className={inputCls}
          />
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className={removeBtnCls}>
            삭제
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])} className={addBtnCls}>
        + 항목 추가
      </button>
    </div>
  );
}

export function GuideContentForm({ content: initial }: { content: GuideContent }) {
  const router = useRouter();
  const [content, setContent] = useState<GuideContent>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  function patch(p: Partial<GuideContent>) {
    setContent((prev) => ({ ...prev, ...p }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/content/guide", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "저장에 실패했습니다.");
        return;
      }
      setMessage("저장되었습니다. '대관 안내' 페이지에 바로 반영됩니다.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function updateStep(i: number, patchS: Partial<GuideStep>) {
    patch({ steps: content.steps.map((s, j) => (j === i ? { ...s, ...patchS } : s)) });
  }
  function addStep() {
    patch({ steps: [...content.steps, { no: String(content.steps.length + 1).padStart(2, "0"), title: "", desc: "" }] });
  }
  function removeStep(i: number) {
    patch({ steps: content.steps.filter((_, j) => j !== i) });
  }

  return (
    <div className="space-y-8">
      <div className="sticky top-14 z-10 -mx-6 flex items-center justify-between gap-3 border-b border-border/20 bg-background px-6 py-3 sm:top-16">
        <span className={HELP}>수정 중인 내용은 저장 전까지 실제 페이지에 반영되지 않습니다.</span>
        <button
          type="button"
          onClick={() => setPreviewOpen((v) => !v)}
          className={btnClass("secondary", "sm")}
        >
          {previewOpen ? "미리보기 닫기" : "미리보기"}
        </button>
      </div>

      {previewOpen && (
        <div className="border border-border-soft">
          <div className="border-b border-border-soft bg-panel px-4 py-2 text-xs font-bold text-muted">
            미리보기 — 현재 입력값 기준 (저장되지 않음)
          </div>
          <div className="max-h-[70vh] overflow-y-auto bg-background">
            <GuideContentView content={content} disableLinks />
          </div>
        </div>
      )}

      <section>
        <h3 className={SUB_TITLE}>상단 소개 문구</h3>
        <div className="mt-2">
          <NoticeEditor value={content.intro} onChange={(intro) => patch({ intro })} />
        </div>
      </section>

      <section className="border-t border-border/15 pt-7">
        <h3 className={SUB_TITLE}>대관 절차 단계</h3>
        <div className="mt-2 space-y-3">
          {content.steps.map((s, i) => (
            <div key={i} className={cardCls}>
              <div className="flex items-start justify-between gap-2">
                <div className="grid flex-1 grid-cols-3 gap-2">
                  <label>
                    <span className={labelCls}>번호</span>
                    <input value={s.no} onChange={(e) => updateStep(i, { no: e.target.value })} className={inputCls} />
                  </label>
                  <label className="col-span-2">
                    <span className={labelCls}>제목</span>
                    <input value={s.title} onChange={(e) => updateStep(i, { title: e.target.value })} className={inputCls} />
                  </label>
                </div>
                <button type="button" onClick={() => removeStep(i)} className={removeBtnCls}>
                  삭제
                </button>
              </div>
              <label className="mt-2 block">
                <span className={labelCls}>설명</span>
                <textarea rows={2} value={s.desc} onChange={(e) => updateStep(i, { desc: e.target.value })} className={inputCls} />
              </label>
            </div>
          ))}
          <button type="button" onClick={addStep} className={addBtnCls}>
            + 절차 단계 추가
          </button>
        </div>

        <h3 className={`mt-8 ${SUB_TITLE}`}>유의사항 목록</h3>
        <div className="mt-2">
          <TextListEditor items={content.notices} onChange={(notices) => patch({ notices })} />
        </div>
      </section>

      <section className="border-t border-border/15 pt-7">
        <h3 className={SUB_TITLE}>대관 패키지 구성 — 소개 문단</h3>
        <div className="mt-2">
          <NoticeEditor value={content.packageIntro} onChange={(packageIntro) => patch({ packageIntro })} />
        </div>
        <h3 className={`mt-6 ${SUB_TITLE}`}>대관 패키지 구성 — 세부 항목</h3>
        <div className="mt-2">
          <TextListEditor items={content.packageBullets} onChange={(packageBullets) => patch({ packageBullets })} />
        </div>
      </section>

      <section className="border-t border-border/15 pt-7">
        <h3 className={SUB_TITLE}>대관 규약 — 소개 문단</h3>
        <div className="mt-2">
          <NoticeEditor value={content.rulesIntro} onChange={(rulesIntro) => patch({ rulesIntro })} />
        </div>
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
