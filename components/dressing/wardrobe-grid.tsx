"use client";

import { useState } from "react";
import type { CropBox } from "@/lib/claude/schemas";
import { GarmentThumb } from "@/components/analyze/garment-thumb";

export interface WardrobeItem {
  id: string;
  category: string;
  label: string;
  color: string | null;
  material: string | null;
  brand: string | null;
  brand_confidence: "logo_visible" | "suppose" | "inconnue" | null;
  crop_box: CropBox | null;
  source_image_path: string | null;
  product_matches: { title: string; merchant: string; url: string; price: string | null }[];
  created_at: string;
}

const CATEGORIES = [
  { value: "all", label: "Tout" },
  { value: "haut", label: "Hauts" },
  { value: "bas", label: "Bas" },
  { value: "robe", label: "Robes" },
  { value: "veste", label: "Vestes" },
  { value: "chaussures", label: "Chaussures" },
  { value: "accessoire", label: "Accessoires" },
];

export function WardrobeGrid({
  items,
  urls,
}: {
  items: WardrobeItem[];
  urls: Record<string, string>;
}) {
  const [category, setCategory] = useState("all");

  const present = new Set(items.map((item) => item.category));
  const tabs = CATEGORIES.filter(
    (tab) => tab.value === "all" || present.has(tab.value)
  );
  const visible =
    category === "all" ? items : items.filter((item) => item.category === category);

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setCategory(tab.value)}
            className={`min-h-[38px] flex-none rounded-full border px-4 text-sm font-medium transition ${
              category === tab.value
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-surface text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {visible.map((item) => (
          <li
            key={item.id}
            className="flex gap-3 rounded-2xl border border-border-soft bg-surface p-3"
          >
            <GarmentThumb
              imageUrl={item.source_image_path ? (urls[item.source_image_path] ?? "") : ""}
              cropBox={item.crop_box}
              alt={item.label}
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-semibold">{item.label}</span>
              <span className="text-xs text-muted">
                {[item.color, item.material].filter(Boolean).join(" · ")}
              </span>
              {item.brand && item.brand_confidence !== "inconnue" && (
                <span className="text-xs text-muted">
                  {item.brand_confidence === "logo_visible"
                    ? item.brand
                    : `${item.brand} (non confirmé)`}
                </span>
              )}
              {item.product_matches?.length > 0 && (
                <a
                  href={item.product_matches[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-xs font-medium underline underline-offset-2"
                >
                  Pièce similaire : {item.product_matches[0].title}
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
