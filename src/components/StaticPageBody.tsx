export function StaticPageBody({ title, body }: { title: string; body: string }) {
  return (
    <article className="mt-8">
      <h2 className="text-[22px] font-semibold tracking-tight">{title}</h2>
      <div
        className="prose-page mt-5 text-[13.5px] leading-7 text-muted
          [&_h3]:mt-7 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:first:mt-0
          [&_img]:mt-3 [&_img]:max-w-full [&_img]:rounded-sm
          [&_li]:mt-1.5 [&_p]:mt-3 [&_p]:first:mt-0 [&_strong]:text-foreground
          [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5
          [&_table]:mt-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[13px]
          [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2
          [&_th]:border [&_th]:border-border [&_th]:bg-panel [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </article>
  );
}
