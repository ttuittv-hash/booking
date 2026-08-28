import { redirect } from "next/navigation";

// 담당자 초대 (기획서 A11).
//
// [개정 2026-08-28] 초대 랜딩은 회원가입 화면이다. 초대받은 사람은 전용 수락 화면이 아니라
// 일반 회원가입을 그대로 밟되(약관·본인인증·재직증명서 동일), 토큰이 회사를 정하고
// 본인인증한 번호가 초대장 번호와 같으면 심사 없이 바로 승인된다.
//
// 새로 발급되는 링크는 곧장 /register?invite=... 를 가리킨다. 이 경로는 이미 나간 예전
// 링크(/invite?token=...)가 끊기지 않도록 토큰을 그대로 옮겨 주는 리다이렉트다.
export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  redirect(token ? `/register?invite=${encodeURIComponent(token)}` : "/register");
}
