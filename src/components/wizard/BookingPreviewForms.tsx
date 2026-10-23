"use client";
import { Children, cloneElement, createContext, isValidElement, useContext, useId, type HTMLAttributes, type ReactElement, type ReactNode } from "react";
import s from "./BookingPreview.module.css";
export const PreviewDesignContext = createContext(false);
/** Recompose repeated form records as labelled cards; callbacks and validation keys stay intact. */
export function PreviewRepeatRow({children, ...legacy}: HTMLAttributes<HTMLDivElement>) {
  const preview = useContext(PreviewDesignContext);
  const id = useId();
  if (!preview) return <div {...legacy}>{children}</div>;
  const controls: ReactElement<Record<string, unknown>>[] = [];
  const actions: ReactNode[] = [];
  function visit(nodes: ReactNode) {
    Children.forEach(nodes, child => {
      if (!isValidElement<Record<string, unknown>>(child)) return;
      if (child.type === 'input' || child.type === 'select' || child.type === 'textarea') controls.push(child);
      else if (child.type === 'button') actions.push(child);
      else if (child.props.children) visit(child.props.children as ReactNode);
    });
  }
  visit(children);
  return <div className={s.recordCard}><div className={s.recordActions}>{actions}</div><div className={s.recordFields}>{controls.map((control,i) => {
    const label = String(control.props['aria-label'] || control.props.placeholder || (control.type === 'select' ? '역할' : '입력 항목'));
    return <label key={i} htmlFor={`${id}-${i}`}><span>{label}</span>{cloneElement(control,{id:`${id}-${i}`, 'aria-label':label})}</label>;
  })}</div></div>;
}
const titles: Record<string,[string,string]> = {
  applicantDetails:['대관사와 담당자','계약 주체, 운영·안전 담당자와 대관 실적'],
  eventBasics:['공연·행사 정보','공연명, 출연진, 일정과 티켓 오픈 계획'],
  audience:['관객 규모와 프로모션','예상 관객 수, 티켓 구성과 홍보 채널'],
  credibility:['개최 신뢰성','출연진 계약 상태와 해외 아티스트 추가사항'],
};
export function PreviewApplicantSections({order,renderers}: {order:string[];renderers:Record<string,()=>ReactNode>}) {
  return <section><div className={s.heading}><h2>신청할 공연을 알려주세요</h2><p>항목을 하나씩 펼쳐 작성하세요. 입력 내용은 이 브라우저에 자동으로 보관됩니다.</p></div><div className={s.sectionStack}>{order.map((key,i)=><details key={key} data-preview-slot={`slot.3.${key}`} data-preview-group={({applicantDetails:"performanceInfo.applicantContact",eventBasics:"performanceInfo.eventBasics",audience:"audience.ancillaryBusinessPlans"} as Record<string,string>)[key] ?? "slot.3"} className={s.formAccordion} open={i===0}><summary><span className={s.sectionNumber}>{String(i+1).padStart(2,'0')}</span><span><b>{titles[key]?.[0] || key}</b><small>{titles[key]?.[1]}</small></span><span className={s.chevron}>⌄</span></summary><div className={s.accordionBody}>{renderers[key]?.()}</div></details>)}</div></section>;
}
