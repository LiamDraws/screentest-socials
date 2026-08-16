import sharp from "sharp";
import { config, GAME_NAMES } from "./config.js";

/**
 * Deterministic day index used to rotate through games — same formula
 * every run, so it doesn't depend on any stored state. Days since the
 * Unix epoch, mod the rotation length.
 */
function dayIndex(date) {
  const epochDays = Math.floor(date.getTime() / 86_400_000);
  return epochDays % config.gameRotation.length;
}

/** Picks today's featured game slug from the rotation. */
export function getTodaysGame(date = new Date()) {
  const slug = config.gameRotation[dayIndex(date)];
  return { slug, name: GAME_NAMES[slug] || slug };
}

export function todayString(date = new Date()) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD, matches the card API's date param
}

export function buildCardUrl({ slug, size, date }) {
  const params = new URLSearchParams({ game: slug, size, date });
  return `${config.siteBaseUrl}/api/public/card?${params}`;
}

const pngCacheBySize = new Map();

/**
 * Fetches the branded SVG card for a given size and converts it to PNG
 * (platforms don't accept SVG for image posts). Caches per size within a
 * single run, since multiple platforms may request the same size.
 */
export async function getCardPng({ slug, size, date }) {
  if (pngCacheBySize.has(size)) return pngCacheBySize.get(size);

  const url = buildCardUrl({ slug, size, date });
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch card SVG (${size}) from ${url}: ${res.status} ${res.statusText}`);
  }
  const svg = await res.text();
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  const result = { buffer: pngBuffer, contentType: "image/png", sourceUrl: url };
  pngCacheBySize.set(size, result);
  return result;
}

/** Builds the caption. `includeLink: false` omits the raw URL (used for X, see config). */
export function buildCaption({ slug, name }, { includeLink = true } = {}) {
  const lines = [`New puzzle: Screentest ${name} is up 🎬`];

  if (includeLink) {
    lines.push(`Play today's challenge 👉 ${config.siteBaseUrl}/${slug}`);
  } else {
    lines.push(`Play today's challenge — link in bio 👉`);
  }

  lines.push(`#Screentest #${slug}`);
  return lines.join("\n\n");
}
