import { BASE_COMPOSITION_GROUP_ORDER, type BaseCompositionTile } from "@/lib/pricing/rateTableUtils";

// 아레나 탭·중형 탭·중형 단독(midHallOnly)·예상 대관료 화면에서 공통으로 쓰는 "기본 포함" 그리드 카드.
export function BaseCompositionCard({ tiles, note }: { tiles: BaseCompositionTile[]; note: string }) {
  if (tiles.length === 0) return null;
  return (
    <div className="mt-6 border border-border/30 bg-panel/30 p-5">
      <div className="flex items-center gap-2">
        <span className="bg-foreground px-2 py-0.5 text-xs font-bold text-background">기본 포함</span>
        <span className="text-xs font-bold text-foreground">{note}</span>
      </div>
      <div className="mt-4 space-y-4">
        {BASE_COMPOSITION_GROUP_ORDER.map((group) => {
          const groupTiles = tiles.filter((t) => t.group === group);
          if (groupTiles.length === 0) return null;
          return (
            <div key={group}>
              <div className="mb-1.5 text-xs font-bold text-foreground">{group}</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {groupTiles.map((tile) => (
                  <div key={tile.label} className="border border-border/20 bg-background px-3 py-2">
                    <div className="text-xs text-muted">{tile.label}</div>
                    <div className="mt-0.5 text-s font-bold text-foreground">{tile.value}</div>
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
