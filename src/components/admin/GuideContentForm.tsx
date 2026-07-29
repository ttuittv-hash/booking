"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { GuideContent, GuideStep } from "@/lib/content/types";

const inputCls =
  "w-full rounded-sm border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent";
const labelCls = "mb-1 block text-[12px] text-muted";
const cardCls = "rounded border border-border bg-panel/60 p-4";
const removeBtnCls = "shrink-0 text-[12px] text-red-600 hover:underline";
const addBtnCls =
  "mt-2 rounded-sm border border-dashed border-border px-3 py-1.5 text-[12.5px] text-muted hover:border-accent hover:text-accent";

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
      <section>
        <h3 className="text-[14px] font-semibold">상단 소개 문구</h3>
        <textarea
          rows={3}
          value={content.intro}
          onChange={(e) => patch({ intro: e.target.value })}
          className={`mt-2 ${inputCls}`}
        />
      </section>

      <section>
        <h3 className="text-[14px] font-semibold">대관 절차 단계</h3>
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

        <h3 className="mt-6 text-[14px] font-semibold">유의사항 목록</h3>
        <div className="mt-2">
          <TextListEditor items={content.notices} onChange={(notices) => patch({ notices })} />
        </div>
      </section>

      <section>
        <h3 className="text-[14px] font-semibold">대관 패키지 구성 — 소개 문단</h3>
        <textarea
          rows={3}
          value={content.packageIntro}
          onChange={(e) => patch({ packageIntro: e.target.value })}
          className={`mt-2 ${inputCls}`}
        />
        <h3 className="mt-4 text-[14px] font-semibold">대관 패키지 구성 — 세부 항목</h3>
        <div className="mt-2">
          <TextListEditor items={content.packageBullets} onChange={(packageBullets) => patch({ packageBullets })} />
        </div>
      </section>

      <section>
        <h3 className="text-[14px] font-semibold">대관 규약 — 소개 문단</h3>
        <textarea
          rows={3}
          value={content.rulesIntro}
          onChange={(e) => patch({ rulesIntro: e.target.value })}
          className={`mt-2 ${inputCls}`}
        />
      </section>

      {message && <p className="text-[13px] text-good">{message}</p>}
      <button
        type="button"
        disabled={saving}
        onClick={save}
        className="rounded-sm bg-accent px-6 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {saving ? "저장 중..." : "저장"}
      </button>
    </div>
  );
}
