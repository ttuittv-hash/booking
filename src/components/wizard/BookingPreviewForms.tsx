"use client";
import { StepHeading } from "./StepHeading";
import { PreviewChevron } from "./PreviewChevron";
import { Children, cloneElement, createContext, isValidElement, useContext, useId, type HTMLAttributes, type ReactElement, type ReactNode } from "react";
import s from "./BookingPreview.module.css";
export const PreviewDesignContext = createContext(false);
/** Recompose repeated form records as labelled cards; callbacks and validation keys stay intact. */
type FieldSize = "short" | "medium" | "long";
export function PreviewRepeatRow({ children, fieldSizes, ...legacy }: HTMLAttributes<HTMLDivElement> & {
    fieldSizes?: FieldSize[];
}) {
    const preview = useContext(PreviewDesignContext);
    const id = useId();
    if (!preview)
        return <div {...legacy}>{children}</div>;
    const controls: ReactElement<Record<string, unknown>>[] = [];
    const actions: ReactNode[] = [];
    function visit(nodes: ReactNode) {
        Children.forEach(nodes, child => {
            if (!isValidElement<Record<string, unknown>>(child))
                return;
            if (child.type === 'input' || child.type === 'select' || child.type === 'textarea')
                controls.push(child);
            else if (child.type === 'button')
                actions.push(child);
            else if (child.props.children)
                visit(child.props.children as ReactNode);
        });
    }
    visit(children);
    return <div {...legacy} style={undefined} className={s.recordCard}><div className={s.recordActions}>{actions}</div><div className={`${s.recordFields} ${s.sizedFields}`}>{controls.map((control, i) => {
            const label = String(control.props['aria-label'] || control.props.placeholder || (control.type === 'select' ? '역할' : '입력 항목'));
            return <label key={i} data-field-size={fieldSizes?.[i] ?? control.props["data-field-size"] ?? "medium"} htmlFor={`${id}-${i}`}><span>{label}</span>{cloneElement(control, { id: `${id}-${i}`, 'aria-label': label })}</label>;
        })}</div></div>;
}
const titles: Record<string, [
    string,
    string
]> = {
    applicantDetails: ['대관사와 담당자', '계약 주체, 운영·안전 담당자와 대관 실적'],
    eventBasics: ['공연·행사 정보', '공연명, 출연진, 일정과 티켓 오픈 계획'],
    audience: ['관객 규모와 프로모션', '예상 관객 수, 티켓 구성과 홍보 채널'],
    credibility: ['개최 신뢰성', '출연진 계약 상태와 해외 아티스트 추가사항'],
};
export function PreviewApplicantSections({ order, renderers, title }: {
    order: string[];
    renderers: Record<string, () => ReactNode>;
    title: ReactNode;
}) {
    return <section><StepHeading className={s.heading} title={title} lead="내용을 확인하고 필요한 항목을 눌러 작성하세요. 입력 내용은 이 브라우저에 자동으로 보관됩니다."/><div className={s.sectionStack}>{order.map((key, i) => <details key={key} data-preview-slot={`slot.3.${key}`} data-preview-group={({ applicantDetails: "performanceInfo.applicantContact", eventBasics: "performanceInfo.eventBasics", audience: "audience.ancillaryBusinessPlans" } as Record<string, string>)[key] ?? "slot.3"} className={s.formAccordion} open><summary><span className={s.sectionNumber}>{String(i + 1).padStart(2, '0')}</span><span><b>{titles[key]?.[0] || key}</b><small>{titles[key]?.[1]}</small></span><PreviewChevron /></summary><div className={s.accordionBody}>{renderers[key]?.()}</div></details>)}</div></section>;
}
