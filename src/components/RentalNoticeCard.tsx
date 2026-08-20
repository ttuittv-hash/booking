import Link from "next/link";
import type { Notice } from "@/lib/pricing/types";
import { isPinnedTag, TagBadge } from "@/components/TagBadge";
import { ArrowRight, Badge, ButtonLink } from "@/components/ui/kit";

/* ============================================================================
   진행 중인 대관 공고 카드

   대관 일정은 고정 연간 일정표로 박지 않는다. 모집 시기마다 공지사항에 공고로 안내하며,
   **일정 값의 소유는 공지 게시물 하나**다. 이 카드는 그 값을 끌어와 보여주는 창구일 뿐
   자체 일정 필드를 갖지 않는다. 두 곳에 값이 생기면 반드시 어긋난다.
   ========================================================================= */

/** 목록에서 진행 중인 대관 공고 1건을 고른다 (말머리 `대관공고` 완전 일치, 최신순 첫 건) */
export function findCurrentRentalNotice(notices: Notice[]): Notice | undefined {
  return notices.find((n) => isPinnedTag(n.tag));
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

export function RentalNoticeCard({
  notice,
  /** 카드 위 라벨. 홈과 대관 안내가 같은 컴포넌트를 쓰되 라벨만 다르다 */
  label = "최신 대관 공고",
}: {
  notice: Notice;
  label?: string;
}) {
  const meta: [string, string][] = [
    ["접수 개시", notice.applyStart ?? "추후 공지"],
    ["접수 마감", notice.applyEnd ?? "추후 공지"],
    ["대상 공간", notice.targetVenues ?? "공고 본문 참조"],
  ];
  const updated = notice.updatedAt !== notice.createdAt;

  return (
    <article className="border-t-2 border-border pt-6">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="accent">{label}</Badge>
        <TagBadge tag={notice.tag} spacing={false} />
        <span className="text-xs tabular-nums text-muted">
          {formatDate(notice.createdAt)} 게시
          {updated && ` · ${formatDate(notice.updatedAt)} 갱신`}
        </span>
      </div>

      <h3 className="type-kr-heading mt-5 break-keep text-h4-m sm:text-h4">
        <Link href={`/notices/${notice.id}`} className="underline-offset-4 hover:underline">
          {notice.title}
        </Link>
      </h3>

      <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3">
        {meta.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-bold text-muted">{k}</dt>
            <dd className="mt-1 text-s font-bold">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-7 flex flex-wrap items-center gap-6">
        <ButtonLink href={`/notices/${notice.id}`} variant="primary">
          공고 전문 보기
          <ArrowRight />
        </ButtonLink>
        <Link href="/notices" className="text-s font-bold underline-offset-4 hover:underline">
          지난 대관 공고 모두 보기
        </Link>
      </div>
    </article>
  );
}

/** 진행 중인 공고가 없을 때. 빈 카드 자리를 남기지 않고 이 블록으로 대체한다. */
export function NoRentalNotice() {
  return (
    <div className="border-t-2 border-border pt-6">
      <p className="measure break-keep text-m">
        현재 접수 중인 대관 공고가 없습니다. 다음 공고는 공지사항에 게시되며, 회원으로
        가입하시면 새 공고가 올라올 때 이메일로 안내받으실 수 있습니다.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <ButtonLink href="/notices" variant="secondary">
          공지사항 보기
          <ArrowRight />
        </ButtonLink>
        <ButtonLink href="/register" variant="secondary">
          회원가입
        </ButtonLink>
      </div>
    </div>
  );
}
