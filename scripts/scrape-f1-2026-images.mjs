/**
 * Downloads F1 2026 race imagery from formula1.com schedule and per-race pages.
 * Run: node scripts/scrape-f1-2026-images.mjs
 *
 * Output: public/f1-2026-images/{slug}/ (hero, card, track when found)
 *
 * Note: Images are © Formula One; use per F1 / your license terms.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "f1-2026-images");

/** URL slug on formula1.com → filename stem under static-assets/2026/races/card/ */
const CARD_SLUG_OVERRIDES = {
  "united-arab-emirates": "abu-dhabi",
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} ${url}`);
  return res.text();
}

function extractSlugsFromSchedule(html) {
  const set = new Set();
  for (const m of html.matchAll(/\/en\/racing\/2026\/([a-z0-9-]+)/gi)) {
    const s = m[1];
    if (!s.startsWith("pre-season-testing")) set.add(s);
  }
  return [...set].sort();
}

/** media.formula1.com and image paths in quotes */
function extractMediaUrls(html) {
  const urls = new Set();
  for (const m of html.matchAll(
    /https:\/\/media\.formula1\.com\/[^"'\\\s<>]+/g
  )) {
    urls.add(m[0].replace(/&amp;/g, "&"));
  }
  return [...urls];
}

function pickHeroUrl(urls) {
  const hero = urls.find(
    (u) =>
      /\/fom-website\/static-assets\/2026\/races\/[^/]+\.webp$/i.test(u) ||
      /\/fom-website\/static-assets\/2026\/races\/[^/]+\.jpg$/i.test(u) ||
      /\/fom-website\/static-assets\/2026\/races\/[^/]+\.png$/i.test(u)
  );
  return hero ?? null;
}

function pickTrackUrl(urls) {
  const track = urls.find((u) =>
    /track.*\.(png|webp|jpg)$/i.test(u.split("/").pop() ?? "")
  );
  return track ?? null;
}

function cardUrlForSlug(slug) {
  const fileSlug = CARD_SLUG_OVERRIDES[slug] ?? slug;
  return `https://media.formula1.com/image/upload/c_lfill,w_1920/q_auto/v1740000001/fom-website/static-assets/2026/races/card/${fileSlug}.webp`;
}

async function downloadFile(url, destPath) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(dirname(destPath), { recursive: true });
  await writeFile(destPath, buf);
  return buf.length;
}

function extFromUrl(url) {
  const base = url.split("?")[0];
  const m = /\.([a-z0-9]+)$/i.exec(base);
  return m ? m[1].toLowerCase() : "bin";
}

async function main() {
  console.log("Fetching 2026 schedule…");
  const scheduleHtml = await fetchText(
    "https://www.formula1.com/en/racing/2026"
  );
  const slugs = extractSlugsFromSchedule(scheduleHtml);
  console.log(`Found ${slugs.length} race slugs:`, slugs.join(", "));

  await mkdir(OUT_DIR, { recursive: true });

  const summary = [];

  for (const slug of slugs) {
    const dir = join(OUT_DIR, slug);
    await mkdir(dir, { recursive: true });
    const entry = { slug, files: [] };

    const cardUrl = cardUrlForSlug(slug);
    try {
      const cardPath = join(dir, `card.${extFromUrl(cardUrl)}`);
      const n = await downloadFile(cardUrl, cardPath);
      entry.files.push({ name: "card", bytes: n });
      console.log(`  ${slug} card OK (${n} bytes)`);
    } catch (e) {
      console.warn(`  ${slug} card: ${e.message}`);
    }

    try {
      const pageHtml = await fetchText(
        `https://www.formula1.com/en/racing/2026/${slug}`
      );
      const urls = extractMediaUrls(pageHtml);
      const hero = pickHeroUrl(urls);
      const track = pickTrackUrl(urls);

      if (hero && hero !== cardUrl) {
        const hPath = join(dir, `hero.${extFromUrl(hero)}`);
        const n = await downloadFile(hero, hPath);
        entry.files.push({ name: "hero", bytes: n });
        console.log(`  ${slug} hero OK (${n} bytes)`);
      }
      if (track) {
        const tPath = join(dir, `track.${extFromUrl(track)}`);
        const n = await downloadFile(track, tPath);
        entry.files.push({ name: "track", bytes: n });
        console.log(`  ${slug} track OK (${n} bytes)`);
      }
      if (!hero && !track) {
        console.log(`  ${slug} subpage: no extra hero/track matched`);
      }
    } catch (e) {
      console.warn(`  ${slug} subpage: ${e.message}`);
    }

    summary.push(entry);
  }

  await writeFile(
    join(OUT_DIR, "manifest.json"),
    JSON.stringify({ generated: new Date().toISOString(), races: summary }, null, 2)
  );
  console.log(`Done. Output: ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
