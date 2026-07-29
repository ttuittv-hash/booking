import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getPageBySlug, listPages } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { PageTreeNav } from "@/components/PageTreeNav";
import { StaticPageBody } from "@/components/StaticPageBody";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getPageBySlug("GUIDE", slug);
  return { title: page ? `${page.title} | 대관 안내` : "대관 안내 | 서울아레나" };
}

export default async function GuideSubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  const { slug } = await params;
  const pages = listPages("GUIDE");
  const current = getPageBySlug("GUIDE", slug);
  if (!current) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/guide" currentUser={currentUser} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16 sm:px-8">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">STAGE</p>
        <h1 className="mt-3 text-[30px] font-semibold tracking-tight sm:text-[36px]">대관 안내</h1>

        <PageTreeNav pages={pages} basePath="/guide" activeSlug={current.slug} />

        <StaticPageBody title={current.title} body={current.body} />
      </main>
    </div>
  );
}
