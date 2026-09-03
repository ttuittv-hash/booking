import type { AppUser } from "@/lib/pricing/types";
import { getScreenTextContent } from "@/lib/db";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";

/**
 * 상단바 — 서버에서 콘텐츠를 읽어 클라이언트 내비게이션에 넘긴다 (2026-09-03).
 *
 * 상단바 자체는 드롭다운·알림 폴링 때문에 클라이언트 컴포넌트여야 하는데, 운영자가
 * 백오피스에서 고치는 문구(BOOK IT 「오픈 예정」 안내)는 DB 에 있다. 화면마다 프롭으로
 * 들고 다니면 스무 곳을 고쳐야 하므로, 여기 한 겹을 두고 안에서 읽는다.
 *
 * 조회는 요청당 한 번이다(`getScreenTextContent` 는 React.cache).
 */
export async function PublicHeader({
  active,
  currentUser,
}: {
  active: string;
  currentUser: AppUser | null;
}) {
  const screenText = await getScreenTextContent();
  return (
    <PublicHeaderNav
      active={active}
      currentUser={currentUser}
      bookItNotice={screenText.bookItNotice}
    />
  );
}
