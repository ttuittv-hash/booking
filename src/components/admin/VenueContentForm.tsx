"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { VenueAmenity, VenueContent, VenueHall, VenueSpec } from "@/lib/content/types";
import { NoticeEditor } from "./NoticeEditor";

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
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={item}
            placeholder={placeholder}
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

export function VenueContentForm({ content: initial }: { content: VenueContent }) {
  const router = useRouter();
  const [content, setContent] = useState<VenueContent>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function patch(p: Partial<VenueContent>) {
    setContent((prev) => ({ ...prev, ...p }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/content/venue", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "저장에 실패했습니다.");
        return;
      }
      setMessage("저장되었습니다. '서울아레나 소개' 페이지에 바로 반영됩니다.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function updateHall(i: number, patchH: Partial<VenueHall>) {
    patch({ halls: content.halls.map((h, j) => (j === i ? { ...h, ...patchH } : h)) });
  }
  function addHall() {
    patch({
      halls: [...content.halls, { no: String(content.halls.length + 1).padStart(2, "0"), title: "", titleEn: "", stat: "", desc: "" }],
    });
  }
  function removeHall(i: number) {
    patch({ halls: content.halls.filter((_, j) => j !== i) });
  }

  function updateSpec(i: number, patchS: Partial<VenueSpec>) {
    patch({ specs: content.specs.map((s, j) => (j === i ? { ...s, ...patchS } : s)) });
  }
  function addSpec() {
    patch({ specs: [...content.specs, { name: "", rows: [] }] });
  }
  function removeSpec(i: number) {
    patch({ specs: content.specs.filter((_, j) => j !== i) });
  }
  function updateSpecRow(specIdx: number, rowIdx: number, key: 0 | 1, value: string) {
    const spec = content.specs[specIdx];
    const rows = spec.rows.map((r, j) => {
      if (j !== rowIdx) return r;
      const next: [string, string] = [...r] as [string, string];
      next[key] = value;
      return next;
    });
    updateSpec(specIdx, { rows });
  }
  function addSpecRow(specIdx: number) {
    updateSpec(specIdx, { rows: [...content.specs[specIdx].rows, ["", ""]] });
  }
  function removeSpecRow(specIdx: number, rowIdx: number) {
    updateSpec(specIdx, { rows: content.specs[specIdx].rows.filter((_, j) => j !== rowIdx) });
  }

  function updateAmenityList(
    key: "arenaAmenities" | "mediumHallAmenities",
    i: number,
    patchA: Partial<VenueAmenity>,
  ) {
    patch({ [key]: content[key].map((a, j) => (j === i ? { ...a, ...patchA } : a)) } as Partial<VenueContent>);
  }
  function addAmenity(key: "arenaAmenities" | "mediumHallAmenities") {
    patch({ [key]: [...content[key], { name: "", desc: "" }] } as Partial<VenueContent>);
  }
  function removeAmenity(key: "arenaAmenities" | "mediumHallAmenities", i: number) {
    patch({ [key]: content[key].filter((_, j) => j !== i) } as Partial<VenueContent>);
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-[14px] font-semibold">상단 소개 문구</h3>
        <div className="mt-2">
          <NoticeEditor value={content.intro} onChange={(intro) => patch({ intro })} />
        </div>
      </section>

      <section>
        <h3 className="text-[14px] font-semibold">시설 개요 — 소개 문단</h3>
        <div className="mt-2">
          <NoticeEditor value={content.overviewIntro} onChange={(overviewIntro) => patch({ overviewIntro })} />
        </div>

        <h3 className="mt-6 text-[14px] font-semibold">시설 카드 (아레나/중형공연장/컨벤션)</h3>
        <div className="mt-2 space-y-3">
          {content.halls.map((h, i) => (
            <div key={i} className={cardCls}>
              <div className="flex items-start justify-between gap-2">
                <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
                  <label>
                    <span className={labelCls}>번호</span>
                    <input value={h.no} onChange={(e) => updateHall(i, { no: e.target.value })} className={inputCls} />
                  </label>
                  <label>
                    <span className={labelCls}>이름</span>
                    <input value={h.title} onChange={(e) => updateHall(i, { title: e.target.value })} className={inputCls} />
                  </label>
                  <label>
                    <span className={labelCls}>영문명</span>
                    <input value={h.titleEn} onChange={(e) => updateHall(i, { titleEn: e.target.value })} className={inputCls} />
                  </label>
                  <label>
                    <span className={labelCls}>수용 규모</span>
                    <input value={h.stat} onChange={(e) => updateHall(i, { stat: e.target.value })} className={inputCls} />
                  </label>
                </div>
                <button type="button" onClick={() => removeHall(i)} className={removeBtnCls}>
                  삭제
                </button>
              </div>
              <label className="mt-2 block">
                <span className={labelCls}>설명</span>
                <textarea rows={2} value={h.desc} onChange={(e) => updateHall(i, { desc: e.target.value })} className={inputCls} />
              </label>
            </div>
          ))}
          <button type="button" onClick={addHall} className={addBtnCls}>
            + 시설 카드 추가
          </button>
        </div>

        <h3 className="mt-6 text-[14px] font-semibold">특징 목록</h3>
        <div className="mt-2">
          <TextListEditor items={content.features} onChange={(features) => patch({ features })} />
        </div>
      </section>

      <section>
        <h3 className="text-[14px] font-semibold">시설 제원 — 소개 문단</h3>
        <div className="mt-2">
          <NoticeEditor value={content.specsIntro} onChange={(specsIntro) => patch({ specsIntro })} />
        </div>

        <h3 className="mt-6 text-[14px] font-semibold">시설별 제원표</h3>
        <div className="mt-2 space-y-3">
          {content.specs.map((s, si) => (
            <div key={si} className={cardCls}>
              <div className="flex items-center justify-between gap-2">
                <label className="flex-1">
                  <span className={labelCls}>시설명</span>
                  <input value={s.name} onChange={(e) => updateSpec(si, { name: e.target.value })} className={inputCls} />
                </label>
                <button type="button" onClick={() => removeSpec(si)} className={removeBtnCls}>
                  삭제
                </button>
              </div>
              <div className="mt-2 space-y-1.5">
                {s.rows.map((row, ri) => (
                  <div key={ri} className="flex items-center gap-2">
                    <input
                      value={row[0]}
                      placeholder="항목명"
                      onChange={(e) => updateSpecRow(si, ri, 0, e.target.value)}
                      className={`w-32 shrink-0 ${inputCls}`}
                    />
                    <input
                      value={row[1]}
                      placeholder="내용"
                      onChange={(e) => updateSpecRow(si, ri, 1, e.target.value)}
                      className={inputCls}
                    />
                    <button type="button" onClick={() => removeSpecRow(si, ri)} className={removeBtnCls}>
                      삭제
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => addSpecRow(si)} className={addBtnCls}>
                  + 제원 행 추가
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addSpec} className={addBtnCls}>
            + 시설 제원 카드 추가
          </button>
        </div>

        <h3 className="mt-6 text-[14px] font-semibold">주요 제공 시설</h3>
        <div className="mt-2">
          <TextListEditor items={content.providedFacilities} onChange={(providedFacilities) => patch({ providedFacilities })} />
        </div>
      </section>

      <section>
        <h3 className="text-[14px] font-semibold">부대 시설</h3>
        {(
          [
            ["arenaAmenities", "아레나 부대시설"],
            ["mediumHallAmenities", "중형공연장 부대시설"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="mt-3">
            <div className="text-[13px] font-medium text-accent">{label}</div>
            <div className="mt-2 space-y-2">
              {content[key].map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={a.name}
                    placeholder="시설명"
                    onChange={(e) => updateAmenityList(key, i, { name: e.target.value })}
                    className={`w-56 shrink-0 ${inputCls}`}
                  />
                  <input
                    value={a.desc}
                    placeholder="설명 (선택)"
                    onChange={(e) => updateAmenityList(key, i, { desc: e.target.value })}
                    className={inputCls}
                  />
                  <button type="button" onClick={() => removeAmenity(key, i)} className={removeBtnCls}>
                    삭제
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => addAmenity(key)} className={addBtnCls}>
                + 항목 추가
              </button>
            </div>
          </div>
        ))}
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
