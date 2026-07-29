"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { HomeContent } from "@/lib/content/types";

const inputCls =
  "w-full rounded-sm border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent";
const labelCls = "mb-1 block text-[12px] text-muted";
const cardCls = "rounded border border-border bg-panel/60 p-4";
const addBtnCls =
  "mt-2 rounded-sm border border-dashed border-border px-3 py-1.5 text-[12.5px] text-muted hover:border-accent hover:text-accent";
const removeBtnCls = "shrink-0 text-[12px] text-red-600 hover:underline";

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

  function updateFeature(i: number, patchF: Partial<HomeContent["features"][number]>) {
    patch({ features: content.features.map((f, j) => (j === i ? { ...f, ...patchF } : f)) });
  }
  function addFeature() {
    patch({ features: [...content.features, { title: "", desc: "", href: "/venue", image: null }] });
  }
  function removeFeature(i: number) {
    patch({ features: content.features.filter((_, j) => j !== i) });
  }

  function updateProcessStep(i: number, patchS: Partial<HomeContent["processSteps"][number]>) {
    patch({ processSteps: content.processSteps.map((s, j) => (j === i ? { ...s, ...patchS } : s)) });
  }
  function addProcessStep() {
    patch({
      processSteps: [
        ...content.processSteps,
        { no: String(content.processSteps.length + 1).padStart(2, "0"), title: "", desc: "" },
      ],
    });
  }
  function removeProcessStep(i: number) {
    patch({ processSteps: content.processSteps.filter((_, j) => j !== i) });
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
        <h3 className="text-[14px] font-semibold">히어로 (상단 이미지 + 카피 + 버튼)</h3>
        <label className="mt-3 block">
          <span className={labelCls}>상단 라벨 (예: HOST IT.)</span>
          <input value={content.heroEyebrow} onChange={(e) => patch({ heroEyebrow: e.target.value })} className={inputCls} />
        </label>
        <label className="mt-3 block">
          <span className={labelCls}>헤드라인 (줄바꿈 가능)</span>
          <textarea rows={2} value={content.heroTitle} onChange={(e) => patch({ heroTitle: e.target.value })} className={inputCls} />
        </label>
        <label className="mt-3 block">
          <span className={labelCls}>본문 문구 (줄바꿈 가능)</span>
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
                className="h-24 w-40 rounded-sm border border-border object-cover"
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

      <section>
        <h3 className="text-[14px] font-semibold">미션 / 비전</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block">
              <span className={labelCls}>라벨 (예: MISSION)</span>
              <input value={content.missionLabel} onChange={(e) => patch({ missionLabel: e.target.value })} className={inputCls} />
            </label>
            <label className="mt-2 block">
              <span className={labelCls}>미션 문구 (줄바꿈 가능)</span>
              <textarea rows={3} value={content.mission} onChange={(e) => patch({ mission: e.target.value })} className={inputCls} />
            </label>
          </div>
          <div>
            <label className="block">
              <span className={labelCls}>라벨 (예: VISION)</span>
              <input value={content.visionLabel} onChange={(e) => patch({ visionLabel: e.target.value })} className={inputCls} />
            </label>
            <label className="mt-2 block">
              <span className={labelCls}>비전 문구 (줄바꿈 가능)</span>
              <textarea rows={3} value={content.vision} onChange={(e) => patch({ vision: e.target.value })} className={inputCls} />
            </label>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-[14px] font-semibold">특징 버튼</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label>
            <span className={labelCls}>상단 라벨 (예: STRATEGY)</span>
            <input value={content.featuresLabel} onChange={(e) => patch({ featuresLabel: e.target.value })} className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>제목 (예: 서울아레나의 방향성)</span>
            <input value={content.featuresTitle} onChange={(e) => patch({ featuresTitle: e.target.value })} className={inputCls} />
          </label>
        </div>

        <div className="mt-3 space-y-3">
          {content.features.map((f, i) => (
            <div key={i} className={cardCls}>
              <div className="flex items-start justify-between gap-2">
                <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                  <label>
                    <span className={labelCls}>제목</span>
                    <input value={f.title} onChange={(e) => updateFeature(i, { title: e.target.value })} className={inputCls} />
                  </label>
                  <label className="sm:col-span-2">
                    <span className={labelCls}>설명</span>
                    <input value={f.desc} onChange={(e) => updateFeature(i, { desc: e.target.value })} className={inputCls} />
                  </label>
                </div>
                <button type="button" onClick={() => removeFeature(i)} className={removeBtnCls}>
                  삭제
                </button>
              </div>
              <label className="mt-2 block">
                <span className={labelCls}>연결 링크</span>
                <input value={f.href} onChange={(e) => updateFeature(i, { href: e.target.value })} className={inputCls} />
              </label>
              <div className="mt-2">
                <span className={labelCls}>이미지 (선택)</span>
                {f.image ? (
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.image} alt={f.title} className="h-16 w-28 rounded-sm border border-border object-cover" />
                    <button type="button" onClick={() => updateFeature(i, { image: null })} className={removeBtnCls}>
                      이미지 삭제
                    </button>
                  </div>
                ) : (
                  <label className="inline-block">
                    <span className={addBtnCls}>
                      {imageUploading === `feature-${i}` ? "업로드 중..." : "+ 이미지 업로드"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={imageUploading === `feature-${i}`}
                      onChange={(e) => uploadSingleImage(e, `feature-${i}`, (url) => updateFeature(i, { image: url }))}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          ))}
          <button type="button" onClick={addFeature} className={addBtnCls}>
            + 특징 버튼 추가
          </button>
        </div>
      </section>

      <section>
        <h3 className="text-[14px] font-semibold">신청 절차</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label>
            <span className={labelCls}>상단 라벨 (예: APPLICATION PROCESS)</span>
            <input value={content.processLabel} onChange={(e) => patch({ processLabel: e.target.value })} className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>제목 (예: 신청 절차 안내)</span>
            <input value={content.processTitle} onChange={(e) => patch({ processTitle: e.target.value })} className={inputCls} />
          </label>
        </div>

        <div className="mt-3 space-y-3">
          {content.processSteps.map((s, i) => (
            <div key={i} className={cardCls}>
              <div className="flex items-start justify-between gap-2">
                <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-4">
                  <label>
                    <span className={labelCls}>번호</span>
                    <input value={s.no} onChange={(e) => updateProcessStep(i, { no: e.target.value })} className={inputCls} />
                  </label>
                  <label className="sm:col-span-1">
                    <span className={labelCls}>제목</span>
                    <input value={s.title} onChange={(e) => updateProcessStep(i, { title: e.target.value })} className={inputCls} />
                  </label>
                  <label className="sm:col-span-2">
                    <span className={labelCls}>설명</span>
                    <input value={s.desc} onChange={(e) => updateProcessStep(i, { desc: e.target.value })} className={inputCls} />
                  </label>
                </div>
                <button type="button" onClick={() => removeProcessStep(i)} className={removeBtnCls}>
                  삭제
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addProcessStep} className={addBtnCls}>
            + 절차 단계 추가
          </button>
        </div>
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
