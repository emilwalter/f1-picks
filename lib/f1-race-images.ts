/**
 * Local static assets from public/f1-2026-images (scraped from formula1.com).
 * Maps championship round → folder slug for the 2026 calendar order.
 */

export const F1_2026_ROUND_SLUG: Record<number, string> = {
  1: "australia",
  2: "china",
  3: "japan",
  4: "miami",
  5: "canada",
  6: "monaco",
  7: "barcelona-catalunya",
  8: "austria",
  9: "great-britain",
  10: "belgium",
  11: "hungary",
  12: "netherlands",
  13: "italy",
  14: "spain",
  15: "azerbaijan",
  16: "singapore",
  17: "united-states",
  18: "mexico",
  19: "brazil",
  20: "las-vegas",
  21: "qatar",
  22: "united-arab-emirates",
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
