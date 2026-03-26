/**
 * Local static assets from public/f1-2026-images (scraped from formula1.com).
 * Round numbers must match the schedule returned by f1api.dev (used in Convex sync),
 * not necessarily the order shown on formula1.com (which omits Bahrain/Saudi as
 * separate rounds in the public 2026 list).
 */
export const F1_2026_ROUND_SLUG: Record<number, string> = {
  1: "australia",
  2: "china",
  3: "japan",
  4: "bahrain",
  5: "saudi-arabia",
  6: "miami",
  7: "canada",
  8: "monaco",
  9: "barcelona-catalunya",
  10: "austria",
  11: "great-britain",
  12: "belgium",
  13: "hungary",
  14: "netherlands",
  15: "italy",
  16: "spain",
  17: "azerbaijan",
  18: "singapore",
  19: "united-states",
  20: "mexico",
  21: "brazil",
  22: "las-vegas",
  23: "qatar",
  24: "united-arab-emirates",
};

export type F1RaceStaticImages = {
  card: string;
  track: string;
};

/**
 * Public URLs for Next.js <Image src="…" /> (files live under /public/f1-2026-images).
 * Returns null when we have no assets for that season (only 2026 is bundled today).
 */
export function getF1RaceStaticImagePaths(
  seasonYear: number,
  round: number
): F1RaceStaticImages | null {
  if (seasonYear !== 2026) return null;
  const slug = F1_2026_ROUND_SLUG[round];
  if (!slug) return null;
  return {
    card: `/f1-2026-images/${slug}/card.webp`,
    track: `/f1-2026-images/${slug}/track.webp`,
  };
}
