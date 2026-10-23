"use client";
import { IconCheck, IconChevronRight } from "@tabler/icons-react";
import { useWizardText } from "@/lib/content/wizardText";
import s from "./BookingPreview.module.css";
type Props = { step: number; maxUnlockedStep: number; locked: boolean; onJump: (step: number) => void };
const stages = [
  { entry: 1, end: 1, en: "VENUE & DATE", ko: "공간과 일정" },
  { entry: 2, end: 2, en: "RATE & OPTION", ko: "구성과 옵션" },
  { entry: 3, end: 7, en: "APPLICANT INFO", ko: "신청자 정보" },
  { entry: 8, end: 9, en: "SUBMIT", ko: "신청서 제출" },
];
export function BookingPreviewNav({ step, maxUnlockedStep, locked, onJump }: Props) {
  return <aside className={s.steps}><h1>BOOK IT</h1><p>공간과 일정 선택부터<br/>신청서 제출까지</p><nav aria-label="신청 단계">{stages.map((stage,i) => {
    const active = step >= stage.entry && step <= stage.end;
    return <button key={stage.en} disabled={locked || stage.entry > maxUnlockedStep} aria-current={active ? "step" : undefined} onClick={() => onJump(stage.entry)}><span className={s.number}>{step > stage.end ? <IconCheck size={16}/> : i+1}</span><span><b>{stage.ko}</b><small>{stage.en}</small></span></button>;
  })}</nav></aside>;
}
export function BookingPreviewSubnav({ step, maxUnlockedStep, locked, onJump }: Props) {
  const { tStr } = useWizardText();
  const stage = stages.findIndex(g => step >= g.entry && step <= g.end);
  const pages = stage === 2 ? [
    [3, tStr("stepNav.step.applicantInfo", "대관사 및 행사 정보")],
    [4, tStr("stepNav.step.marketing", "마케팅 및 프로모션 계획")],
    [6, tStr("stepNav.step.safetyPledge", "안전관리 서약서")],
    [7, tStr("stepNav.step.attachments", "자료 첨부")],
  ] as const : stage === 3 ? [[8,"예상 대관료"],[9,"최종 검토 및 제출"]] as const : [];
  return <div className={s.subnav}><span className={s.eyebrow}>STEP {stage+1} OF 4 · {stages[stage]?.en}</span>{pages.length > 0 && <nav aria-label="단계 세부 항목">{pages.map(([n,title],index)=><span className={s.subnavItem} key={n}>{index > 0 && <IconChevronRight className={s.subnavArrow} size={16} aria-hidden="true"/>}<button onClick={()=>onJump(n)} aria-current={step===n?"step":undefined} disabled={locked || (n > step && n > maxUnlockedStep)}>{title}</button></span>)}</nav>}</div>;
}
