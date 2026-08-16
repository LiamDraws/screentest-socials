import sharp from "sharp";
import { config, GAME_NAMES } from "./config.js";

// The card API gates on `todayAest()` — only past-date puzzles are
// available (today's stays hidden until it's "yesterday", so the card
// never spoils the puzzle you'd currently be solving on-site). All date
// math here is AEST-aware for that reason, not just plain UTC.
const SITE_TIMEZONE = "Australia/Brisbane"; // fixed UTC+10, no DST — adjust if the site actually uses a DST-observing zone (e.g. Australia/Sydney)

function dateStringInTz(date, timeZone) {
  // en-CA locale formats as YYYY-MM-DD, which is what the card API expects.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Today's date as seen in the site's timezone. */
export function todayAest(date = new Date()) {
  return dateStringInTz(date, SITE_TIMEZONE);
}

/** Yesterday's date as seen in the site's timezone — this is the date the card API will actually serve. */
export function yesterdayAest(date = new Date()) {
  const today = new Date(`${todayAest(date)}T00:00:00Z`);
  today.setUTCDate(today.getUTCDate() - 1);
  return today.toISOString().slice(0, 10);
}

/**
 * Deterministic day index used to rotate through games — derived from the
 * puzzle date being featured (yesterday's), so the same day always maps
 * to the same game regardless of what time the workflow happens to run.
 */
function dayIndexForDate(dateString) {
  const epochDays = Math.floor(new Date(`${dateString}T00:00:00Z`).getTime() / 86_400_000);
  return epochDays % config.gameRotation.length;
}

/** Picks the featured game for a given puzzle date (defaults to yesterday, the reveal date). */
export function getFeaturedGame(dateString = yesterdayAest()) {
  const slug = config.gameRotation[dayIndexForDate(dateString)];
  return { slug, name: GAME_NAMES[slug] || slug };
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
  const lines = [`Yesterday's Screentest ${name} puzzle, solved 🎬`];

  if (includeLink) {
    lines.push(`Play today's challenge 👉 ${config.siteBaseUrl}/${slug}`);
  } else {
    lines.push(`Play today's challenge — link in bio 👉`);
  }

  lines.push(`#Screentest #${slug}`);
  return lines.join("\n\n");
}
