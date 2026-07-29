export function TagBadge({ tag }: { tag: string | null }) {
  if (!tag) return null;
  return (
    <span className="mr-2 shrink-0 rounded-sm bg-accent-soft px-1.5 py-0.5 align-middle text-[11px] font-semibold text-accent">
      {tag}
    </span>
  );
}
