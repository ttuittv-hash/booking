import { BASE_COMPOSITION_GROUP_ORDER, type BaseCompositionTile } from "@/lib/pricing/rateTableUtils";

// 아레나 탭·중형 탭·중형 단독(midHallOnly)·예상 대관료 화면에서 공통으로 쓰는 "기본 포함" 그리드 카드.
export function BaseCompositionCard({ tiles, note }: { tiles: BaseCompositionTile[]; note: string }) {
  if (tiles.length === 0) return null;
  return (
    <div className="mt-6 rounded border border-good/30 bg-good-soft/30 p-5">
      <div className="flex items-center gap-2">
        <span className="rounded-sm bg-good px-2 py-0.5 text-[10.5px] font-semibold text-white">기본 포함</span>
        <span className="text-[12.5px] font-medium text-foreground">{note}</span>
      </div>
      <div className="mt-4 space-y-4">
        {BASE_COMPOSITION_GROUP_ORDER.map((group) => {
          const groupTiles = tiles.filter((t) => t.group === group);
          if (groupTiles.length === 0) return null;
          return (
            <div key={group}>
              <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-good">{group}</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {groupTiles.map((tile) => (
                  <div key={tile.label} className="rounded-sm border border-good/20 bg-background px-3 py-2">
                    <div className="text-[11px] text-muted">{tile.label}</div>
                    <div className="mt-0.5 text-[13px] font-semibold text-good">{tile.value}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
