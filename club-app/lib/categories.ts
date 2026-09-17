export const CATEGORIES = [
  "u6",
  "u7",
  "u8",
  "u9",
  "u10",
  "u11",
  "u12",
  "u13",
  "u14",
  "u15",
  "u16",
  "u17",
  "u18_u19",
] as const;

export type Category = (typeof CATEGORIES)[number];

const LABELS: Record<Category, string> = {
  u6: "U6",
  u7: "U7",
  u8: "U8",
  u9: "U9",
  u10: "U10",
  u11: "U11",
  u12: "U12",
  u13: "U13",
  u14: "U14",
  u15: "U15",
  u16: "U16",
  u17: "U17",
  u18_u19: "U18/U19",
};

export function categoryLabel(category: string | null | undefined): string {
  if (!category) return "—";
  return LABELS[category as Category] ?? category;
}
