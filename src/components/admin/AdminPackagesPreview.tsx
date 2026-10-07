"use client";
import { Suspense, useState } from "react";
import { PackagesForm } from "./PackagesForm";
import { buildSeedRateTable } from "@/lib/pricing/seed";
import { DEFAULT_RATES_CONTENT } from "@/lib/content/pageContent";
import s from "./AdminPackagesPreview.module.css";
export function AdminPackagesPreview(){
 const [rates]=useState(()=>buildSeedRateTable());
 return <div className={s.preview}><p className={s.lead}>패키지 이름·기본 대관료·객석 규모·매체 등급·기본 포함 항목을 한 화면에서 편집하고, 새 패키지도 추가할 수 있습니다. 부대시설 단가와 공통 요율은 “요금표 관리”에서 수정하세요.</p><p className={s.note}>원본 기본 데이터를 사용한 디자인 시안입니다. 편집·저장은 현재 화면에만 반영됩니다.</p><Suspense fallback={<p>패키지를 불러오는 중입니다.</p>}><PackagesForm rateTable={rates} ratesContent={DEFAULT_RATES_CONTENT} preview /></Suspense></div>;
}
