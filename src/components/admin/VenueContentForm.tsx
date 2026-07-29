"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { VenueAmenity, VenueContent, VenueHall, VenueHighlight, VenueKeyMap, VenueSpec } from "@/lib/content/types";
import { DEFAULT_VENUE_CONTENT } from "@/lib/content/seed";
import { VenueContentView } from "@/components/VenueContentView";
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
  const [keyMapUploading, setKeyMapUploading] = useState(false);
  const [amenityGalleryUploading, setAmenityGalleryUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imageUploading, setImageUploading] = useState<string | null>(null);

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
      halls: [
        ...content.halls,
        { no: String(content.halls.length + 1).padStart(2, "0"), title: "", titleEn: "", stat: "", desc: "", image: null },
      ],
    });
  }
  function removeHall(i: number) {
    patch({ halls: content.halls.filter((_, j) => j !== i) });
  }

  function updateSpec(i: number, patchS: Partial<VenueSpec>) {
    patch({ specs: content.specs.map((s, j) => (j === i ? { ...s, ...patchS } : s)) });
  }
  function addSpec() {
    patch({ specs: [...content.specs, { name: "", rows: [], image: null }] });
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

  function updateHighlight(i: number, patchH: Partial<VenueHighlight>) {
    patch({ specHighlights: content.specHighlights.map((h, j) => (j === i ? { ...h, ...patchH } : h)) });
  }
  function addHighlight() {
    patch({
      specHighlights: [
        ...content.specHighlights,
        { badges: ["ARTIST", "AUDIENCE", "PRODUCER"], highlightBadge: "AUDIENCE", title: "", subtitle: "", cards: [] },
      ],
    });
  }
  function removeHighlight(i: number) {
    patch({ specHighlights: content.specHighlights.filter((_, j) => j !== i) });
  }
  function addHighlightCard(hi: number) {
    const hl = content.specHighlights[hi];
    updateHighlight(hi, { cards: [...hl.cards, { title: "", desc: "", image: null }] });
  }
  function updateHighlightCard(hi: number, ci: number, patchC: Partial<VenueHighlight["cards"][number]>) {
    const hl = content.specHighlights[hi];
    updateHighlight(hi, { cards: hl.cards.map((c, j) => (j === ci ? { ...c, ...patchC } : c)) });
  }
  function removeHighlightCard(hi: number, ci: number) {
    const hl = content.specHighlights[hi];
    updateHighlight(hi, { cards: hl.cards.filter((_, j) => j !== ci) });
  }

  function updateAmenityList(
    key: "arenaAmenities" | "mediumHallAmenities",
    i: number,
    patchA: Partial<VenueAmenity>,
  ) {
    patch({ [key]: content[key].map((a, j) => (j === i ? { ...a, ...patchA } : a)) } as Partial<VenueContent>);
  }
  function addAmenity(key: "arenaAmenities" | "mediumHallAmenities") {
    patch({ [key]: [...content[key], { name: "", desc: "", image: null, featured: false }] } as Partial<VenueContent>);
  }
  function removeAmenity(key: "arenaAmenities" | "mediumHallAmenities", i: number) {
    patch({ [key]: content[key].filter((_, j) => j !== i) } as Partial<VenueContent>);
  }

  async function uploadKeyMap(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setKeyMapUploading(true);
    try {
      const uploaded: VenueKeyMap[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/admin/notices/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (res.ok) uploaded.push({ url: data.url, label: "" });
      }
      patch({ keyMaps: [...content.keyMaps, ...uploaded] });
    } finally {
      setKeyMapUploading(false);
      e.target.value = "";
    }
  }
  function updateKeyMap(i: number, patchK: Partial<VenueKeyMap>) {
    patch({ keyMaps: content.keyMaps.map((k, j) => (j === i ? { ...k, ...patchK } : k)) });
  }
  function removeKeyMap(i: number) {
    patch({ keyMaps: content.keyMaps.filter((_, j) => j !== i) });
  }

  async function uploadAmenityGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setAmenityGalleryUploading(true);
    try {
      const uploaded: VenueKeyMap[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/admin/notices/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (res.ok) uploaded.push({ url: data.url, label: "" });
      }
      patch({ amenityGallery: [...content.amenityGallery, ...uploaded] });
    } finally {
      setAmenityGalleryUploading(false);
      e.target.value = "";
    }
  }
  function updateAmenityGalleryItem(i: number, patchG: Partial<VenueKeyMap>) {
    patch({ amenityGallery: content.amenityGallery.map((g, j) => (j === i ? { ...g, ...patchG } : g)) });
  }
  function removeAmenityGalleryItem(i: number) {
    patch({ amenityGallery: content.amenityGallery.filter((_, j) => j !== i) });
  }

  return (
    <div className="space-y-8">
      <div className="sticky top-14 z-10 -mx-6 flex items-center justify-between border-b border-border bg-background px-6 py-3 sm:top-16">
        <span className="text-[12.5px] text-muted">수정 중인 내용은 저장 전까지 실제 페이지에 반영되지 않습니다.</span>
        <button
          type="button"
          onClick={() => setPreviewOpen((v) => !v)}
          className="shrink-0 rounded-sm border border-border px-4 py-1.5 text-[12.5px] font-medium text-foreground hover:border-accent hover:text-accent"
        >
          {previewOpen ? "미리보기 닫기" : "미리보기"}
        </button>
      </div>

      {previewOpen && (
        <div className="border border-border">
          <div className="border-b border-border bg-panel px-4 py-2 text-[12px] font-medium text-muted">
            미리보기 — 현재 입력값 기준 (저장되지 않음)
          </div>
          <div className="max-h-[70vh] overflow-y-auto bg-background">
            <VenueContentView content={content} />
          </div>
        </div>
      )}

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
              <div className="mt-2">
                <span className={labelCls}>대표 이미지</span>
                {h.image && (
                  <div className="mb-2 flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={h.image} alt={h.title} className="h-16 w-28 rounded-sm border border-border object-cover" />
                    <button type="button" onClick={() => updateHall(i, { image: null })} className={removeBtnCls}>
                      이미지 삭제
                    </button>
                  </div>
                )}
                <label className="inline-block">
                  <span className={addBtnCls}>
                    {imageUploading === `hall-${i}` ? "업로드 중..." : h.image ? "이미지 변경" : "+ 이미지 업로드"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={imageUploading === `hall-${i}`}
                    onChange={(e) => uploadSingleImage(e, `hall-${i}`, (url) => updateHall(i, { image: url }))}
                    className="hidden"
                  />
                </label>
              </div>
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
              <div className="mt-2">
                {s.image && (
                  <div className="mb-2 flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.image} alt={s.name} className="h-16 w-28 rounded-sm border border-border object-cover" />
                    <button type="button" onClick={() => updateSpec(si, { image: null })} className={removeBtnCls}>
                      이미지 삭제
                    </button>
                  </div>
                )}
                <label className="inline-block">
                  <span className={addBtnCls}>
                    {imageUploading === `spec-${si}` ? "업로드 중..." : s.image ? "이미지 변경" : "+ 이미지 업로드"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={imageUploading === `spec-${si}`}
                    onChange={(e) => uploadSingleImage(e, `spec-${si}`, (url) => updateSpec(si, { image: url }))}
                    className="hidden"
                  />
                </label>
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
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[14px] font-semibold">무대 특장</h3>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "무대 특장 항목을 최신 기본값(강조 카드 5종, 세부 설명 포함)으로 되돌립니다. 현재 저장된 무대 특장 내용은 사라집니다. 계속할까요?",
                )
              ) {
                patch({ specHighlights: DEFAULT_VENUE_CONTENT.specHighlights });
              }
            }}
            className="shrink-0 text-[12px] text-accent hover:underline"
          >
            최신 기본값으로 불러오기
          </button>
        </div>
        <p className="mt-1 text-[12px] text-muted">아티스트/관객/제작사 관점의 강점을 카드 형태로 소개합니다.</p>
        <p className="mt-1 text-[12px] text-muted">
          이전에 저장된 내용이 있으면 새로 추가된 세부 카드/설명이 자동으로 보이지 않습니다. 위 버튼으로 최신 기본값을
          불러온 뒤 저장하면 반영됩니다.
        </p>
        <div className="mt-2 space-y-4">
          {content.specHighlights.map((hl, hi) => (
            <div key={hi} className={cardCls}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-semibold text-accent">강조 카드 {hi + 1}</span>
                <button type="button" onClick={() => removeHighlight(hi)} className={removeBtnCls}>
                  삭제
                </button>
              </div>
              <label className="mt-2 block">
                <span className={labelCls}>제목</span>
                <input value={hl.title} onChange={(e) => updateHighlight(hi, { title: e.target.value })} className={inputCls} />
              </label>
              <label className="mt-2 block">
                <span className={labelCls}>부제</span>
                <input value={hl.subtitle} onChange={(e) => updateHighlight(hi, { subtitle: e.target.value })} className={inputCls} />
              </label>
              <div className="mt-2">
                <span className={labelCls}>뱃지 (콤마로 구분, 예: ARTIST,AUDIENCE,PRODUCER)</span>
                <input
                  value={hl.badges.join(",")}
                  onChange={(e) =>
                    updateHighlight(hi, {
                      badges: e.target.value
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean),
                    })
                  }
                  className={inputCls}
                />
              </div>
              <label className="mt-2 block">
                <span className={labelCls}>강조 표시할 뱃지</span>
                <input
                  value={hl.highlightBadge}
                  onChange={(e) => updateHighlight(hi, { highlightBadge: e.target.value })}
                  className={inputCls}
                />
              </label>

              <div className="mt-3">
                <span className={labelCls}>세부 카드</span>
                <div className="space-y-2">
                  {hl.cards.map((c, ci) => (
                    <div key={ci} className="rounded border border-border bg-background p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1.5">
                          <input
                            value={c.title}
                            placeholder="카드 제목"
                            onChange={(e) => updateHighlightCard(hi, ci, { title: e.target.value })}
                            className={inputCls}
                          />
                          <input
                            value={c.desc}
                            placeholder="카드 설명 (선택)"
                            onChange={(e) => updateHighlightCard(hi, ci, { desc: e.target.value })}
                            className={inputCls}
                          />
                        </div>
                        <button type="button" onClick={() => removeHighlightCard(hi, ci)} className={removeBtnCls}>
                          삭제
                        </button>
                      </div>
                      <div className="mt-2">
                        {c.image && (
                          <div className="mb-2 flex items-center gap-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={c.image} alt={c.title} className="h-16 w-28 rounded-sm border border-border object-cover" />
                            <button type="button" onClick={() => updateHighlightCard(hi, ci, { image: null })} className={removeBtnCls}>
                              이미지 삭제
                            </button>
                          </div>
                        )}
                        <label className="inline-block">
                          <span className={addBtnCls}>
                            {imageUploading === `highlight-${hi}-${ci}` ? "업로드 중..." : c.image ? "이미지 변경" : "+ 이미지 업로드"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={imageUploading === `highlight-${hi}-${ci}`}
                            onChange={(e) =>
                              uploadSingleImage(e, `highlight-${hi}-${ci}`, (url) => updateHighlightCard(hi, ci, { image: url }))
                            }
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => addHighlightCard(hi)} className={addBtnCls}>
                    + 세부 카드 추가
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addHighlight} className={addBtnCls}>
            + 강조 카드 블록 추가
          </button>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[14px] font-semibold">부대 시설</h3>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "부대 시설 항목을 최신 기본값(스카이박스·라운지·광장·로비 등 포함)으로 되돌립니다. 현재 저장된 부대 시설 내용은 사라집니다. 계속할까요?",
                )
              ) {
                patch({
                  arenaAmenities: DEFAULT_VENUE_CONTENT.arenaAmenities,
                  mediumHallAmenities: DEFAULT_VENUE_CONTENT.mediumHallAmenities,
                });
              }
            }}
            className="shrink-0 text-[12px] text-accent hover:underline"
          >
            최신 기본값으로 불러오기
          </button>
        </div>
        <p className="mt-1 text-[12px] text-muted">
          이전에 저장된 내용이 있으면 새로 추가된 항목(스카이박스·라운지 등)이 자동으로 보이지 않습니다. 위 버튼으로 최신
          기본값을 불러온 뒤 저장하면 반영됩니다.
        </p>

        <div className="mt-2">
          <span className={labelCls}>공간 사진 갤러리 (라운지·로비 등, 부대 시설 목록 위에 표시)</span>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {content.amenityGallery.map((g, i) => (
              <div key={i} className={cardCls}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.url} alt={g.label || `사진 ${i + 1}`} className="aspect-[4/3] w-full rounded-sm border border-border object-cover" />
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={g.label}
                    placeholder="설명 (선택)"
                    onChange={(e) => updateAmenityGalleryItem(i, { label: e.target.value })}
                    className={inputCls}
                  />
                  <button type="button" onClick={() => removeAmenityGalleryItem(i)} className={removeBtnCls}>
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
          <label className="mt-2 inline-block">
            <span className={addBtnCls}>{amenityGalleryUploading ? "업로드 중..." : "+ 사진 업로드"}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={uploadAmenityGallery}
              disabled={amenityGalleryUploading}
              className="hidden"
            />
          </label>
        </div>

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
                <div key={i} className={cardCls}>
                  <div className="flex items-center gap-2">
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
                  <label className="mt-2 flex items-center gap-1.5 text-[12px] text-muted">
                    <input
                      type="checkbox"
                      checked={a.featured}
                      onChange={(e) => updateAmenityList(key, i, { featured: e.target.checked })}
                    />
                    강조 표시 (큰 썸네일로 상단에 노출)
                  </label>
                  <div className="mt-2">
                    {a.image ? (
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={a.image} alt={a.name} className="h-14 w-24 rounded-sm border border-border object-cover" />
                        <button
                          type="button"
                          onClick={() => updateAmenityList(key, i, { image: null })}
                          className={removeBtnCls}
                        >
                          이미지 삭제
                        </button>
                      </div>
                    ) : (
                      <label className="inline-block">
                        <span className={addBtnCls}>
                          {imageUploading === `${key}-${i}` ? "업로드 중..." : "+ 이미지 업로드"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={imageUploading === `${key}-${i}`}
                          onChange={(e) =>
                            uploadSingleImage(e, `${key}-${i}`, (url) => updateAmenityList(key, i, { image: url }))
                          }
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => addAmenity(key)} className={addBtnCls}>
                + 항목 추가
              </button>
            </div>
          </div>
        ))}
      </section>

      <section>
        <h3 className="text-[14px] font-semibold">키맵 (시설 배치도)</h3>
        <p className="mt-1 text-[12px] text-muted">
          층별 배치도 이미지를 업로드하면 시설 개요 하단에 갤러리로 표시됩니다.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {content.keyMaps.map((k, i) => (
            <div key={i} className={cardCls}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={k.url} alt={k.label || `키맵 ${i + 1}`} className="w-full rounded-sm border border-border" />
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={k.label}
                  placeholder="라벨 (예: 1F, 2F)"
                  onChange={(e) => updateKeyMap(i, { label: e.target.value })}
                  className={inputCls}
                />
                <button type="button" onClick={() => removeKeyMap(i)} className={removeBtnCls}>
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
        <label className="mt-3 inline-block">
          <span className={addBtnCls}>{keyMapUploading ? "업로드 중..." : "+ 키맵 이미지 업로드"}</span>
          <input type="file" accept="image/*" multiple onChange={uploadKeyMap} disabled={keyMapUploading} className="hidden" />
        </label>
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
