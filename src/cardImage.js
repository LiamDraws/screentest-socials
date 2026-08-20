import sharp from "sharp";
import { config } from "./config.js";

// The card API gates on `todayAest()` — answers for today's puzzles stay
// hidden until it's "yesterday" (the cover card may be less strict, but
// the bot always posts about yesterday's puzzles regardless, so this
// applies either way). All date math here is AEST-aware for that reason.
const SITE_TIMEZONE = "Australia/Brisbane"; // fixed UTC+10, no DST — adjust if the site actually uses a DST-observing zone (e.g. Australia/Sydney)

function dateStringInTz(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function todayAest(date = new Date()) {
  return dateStringInTz(date, SITE_TIMEZONE);
}

export function yesterdayAest(date = new Date()) {
  const today = new Date(`${todayAest(date)}T00:00:00Z`);
  today.setUTCDate(today.getUTCDate() - 1);
  return today.toISOString().slice(0, 10);
}

export function buildCardUrl({ kind, size, date }) {
  const params = new URLSearchParams({ kind, size, date });
  return `${config.siteBaseUrl}/api/public/card?${params}`;
}

const pngCache = new Map();

/**
 * Fetches a card (kind: "cover" or "answers") as SVG and converts it to
 * PNG (platforms don't accept SVG for image posts). Caches per
 * kind+size+date within a single run.
 */
export async function getCardPng({ kind, size, date }) {
  const cacheKey = `${kind}-${size}-${date}`;
  if (pngCache.has(cacheKey)) return pngCache.get(cacheKey);

  const url = buildCardUrl({ kind, size, date });
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${kind} card SVG (${size}) from ${url}: ${res.status} ${res.statusText}`);
  }
  const svg = await res.text();
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  const result = { buffer: pngBuffer, contentType: "image/png", sourceUrl: url };
  pngCache.set(cacheKey, result);
  return result;
}

/** Builds the caption. `includeLink: false` omits the raw URL (used for X, see config). */
export function buildCaption({ includeLink = true } = {}) {
  const lines = ["Yesterday's Screentest answers, revealed 🎬"];

  if (includeLink) {
    lines.push(`Play today's puzzles 👉 ${config.siteBaseUrl}`);
  } else {
    lines.push(`Play today's puzzles — link in bio 👉`);
  }

  lines.push("#Screentest");
  return lines.join("\n\n");
}
