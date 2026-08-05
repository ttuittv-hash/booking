import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getInquiryById } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";

export default async function MyInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  if (user.role === "ADMIN") redirect(`/admin/inquiries/${id}`);

  const inquiry = getInquiryById(id);
  if (!inquiry) notFound();
  if (inquiry.userId !== user.id) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage" currentUser={user} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link href="/mypage/inquiries" className="text-[12.5px] font-medium text-accent hover:underline">
          ← 1:1 문의
        </Link>

        <div className="mt-4 flex items-center justify-between gap-3">
          <h1 className="text-[20px] font-semibold">{inquiry.title}</h1>
          <span
            className={`shrink-0 rounded-sm px-2.5 py-1 text-[11px] font-medium ${
              inquiry.status === "ANSWERED" ? "bg-good-soft text-good" : "bg-panel-strong text-muted"
            }`}
          >
            {inquiry.status === "ANSWERED" ? "답변 완료" : "답변 대기"}
          </span>
        </div>
        <p className="mt-1 text-[12px] text-muted">
          {new Date(inquiry.createdAt).toLocaleString("ko-KR")}
        </p>

        <div className="mt-4 whitespace-pre-wrap rounded border border-border bg-background p-5 text-[13.5px] leading-7">
          {inquiry.content}
        </div>

        {inquiry.answer ? (
          <div className="mt-4 rounded border border-accent/30 bg-accent-soft p-5">
            <div className="text-[12px] font-semibold text-accent">운영자 답변</div>
            <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-7">{inquiry.answer}</p>
            {inquiry.answeredAt && (
              <p className="mt-2 text-[11.5px] text-muted">
                {new Date(inquiry.answeredAt).toLocaleString("ko-KR")}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-[13px] text-muted">아직 답변이 등록되지 않았습니다.</p>
        )}
      </main>
    </div>
  );
}
