"use client";
import { PreviewChevron } from "./PreviewChevron";
import { Children, cloneElement, createContext, isValidElement, useContext, useId, type HTMLAttributes, type ReactElement, type ReactNode } from "react";
import s from "./BookingPreview.module.css";
import { recordLayout, type RecordLayout } from "./bookingFormRules";
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
/** Shared title/description column; content retains its own field layout. */
export function DocumentGroup({ title, description, children }: { title: ReactNode; description?: ReactNode; children: ReactNode }) {
    return <div data-document-group className={s.documentGroup}>
        <div className={s.documentGroupHeading}><h3>{title}</h3>{description && <div className={s.documentGroupDescription}>{description}</div>}</div>
        <div className={s.documentGroupContent}>{children}</div>
    </div>;
}
/** Standalone sections share the same panel surface as accordion sections. */
export function DocumentPanel({ children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div {...props} data-document-panel>{children}</div>;
}
/** A shared document table keeps each repeated record on one aligned row. */
export function PreviewRecordTable({ children, label, layout }: { children: ReactNode; label: string; layout?: RecordLayout }) {
    const preview = useContext(PreviewDesignContext);
    const id = useId();
    if (!preview) return <div className="space-y-2">{children}</div>;
    const rows = Children.toArray(children).filter(isValidElement).map(row => {
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
        visit((row.props as { children: ReactNode }).children);
        return { key: row.key, controls, actions };
    });
    if (!rows.length) return null;
    const labels = rows[0].controls.map(control => String(control.props['aria-label'] || control.props.placeholder || (control.type === 'select' ? '역할' : '입력 항목')));
    const { spans, columns: totalColumns, minWidth } = recordLayout(layout);
    return <div className={s.documentTableScroll} role="region" aria-label={label} tabIndex={0}>
        <table className={s.documentTable} data-columns={labels.length} style={minWidth ? { minWidth } : undefined}>
            <caption>{label}</caption>
            <colgroup>{labels.map((_, i) => <col key={i} style={spans ? { width: `${spans[i] / totalColumns * 100}%` } : undefined} />)}<col style={{ width: spans ? `${100 / totalColumns}%` : 48 }} /></colgroup>
            <thead><tr>{labels.map((label, i) => <th key={i} scope="col" id={`${id}-col-${i}`}>{label}</th>)}<th scope="col" className={s.documentAction}><span className="sr-only">행 삭제</span></th></tr></thead>
            <tbody>{rows.map((row, rowIndex) => <tr key={row.key ?? rowIndex}>
                {row.controls.map((control, i) => <td key={i}>{cloneElement(control, { 'aria-label': `${labels[i]} ${rowIndex + 1}행` })}</td>)}
                <td className={s.documentAction}>{row.actions}</td>
            </tr>)}</tbody>
        </table>
    </div>;
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
    const accordionName = useId();
    const displayOrder = [...order];
    const audienceIndex = displayOrder.indexOf('audience');
    const credibilityIndex = displayOrder.indexOf('credibility');
    if (audienceIndex > credibilityIndex && credibilityIndex >= 0) {
        [displayOrder[audienceIndex], displayOrder[credibilityIndex]] = [displayOrder[credibilityIndex], displayOrder[audienceIndex]];
    }
    return <section><div className={s.heading}><h1>대관사 및 행사 정보</h1><p>{title} · 입력 내용은 이 브라우저에 자동으로 보관됩니다.</p></div><div className={s.sectionStack}>{displayOrder.map((key, i) => <details key={key} data-preview-slot={`slot.3.${key}`} data-preview-group={({ applicantDetails: "performanceInfo.applicantContact", eventBasics: "performanceInfo.eventBasics", audience: "audience.ancillaryBusinessPlans" } as Record<string, string>)[key] ?? "slot.3"} className={s.formAccordion} name={accordionName} open={i === 0}><summary><span className={s.sectionNumber}>{String(i + 1).padStart(2, '0')}</span><span><h2>{titles[key]?.[0] || key}</h2><small>{titles[key]?.[1]}</small></span><PreviewChevron /></summary><div className={s.accordionBody}>{renderers[key]?.()}</div></details>)}</div></section>;
}
