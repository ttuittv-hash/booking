"use client";

import { useState } from "react";
import type { VenueKeyMap } from "@/lib/content/types";

export function KeyMapGallery({ keyMaps }: { keyMaps: VenueKeyMap[] }) {
  const [active, setActive] = useState(0);
  if (keyMaps.length === 0) return null;
  const activeIndex = Math.min(active, keyMaps.length - 1);
  const activeMap = keyMaps[activeIndex];

  return (
    <div className="mt-10">
      <div className="text-[13px] font-semibold">키맵</div>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        <div className="flex shrink-0 gap-2 overflow-x-auto sm:w-32 sm:flex-col sm:overflow-visible">
          {keyMaps.map((k, i) => (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              className={[
                "shrink-0 whitespace-nowrap rounded-sm border px-3 py-2 text-left text-[12.5px] font-medium transition-colors",
                activeIndex === i
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-muted hover:border-accent/50 hover:text-foreground",
              ].join(" ")}
            >
              {k.label || `키맵 ${i + 1}`}
            </button>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeMap.url}
            alt={activeMap.label || `키맵 ${activeIndex + 1}`}
            className="w-full rounded-sm border border-border"
          />
        </div>
      </div>
    </div>
  );
}
