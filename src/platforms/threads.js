import { config } from "../config.js";

const GRAPH_BASE = "https://graph.threads.net/v1.0";

/**
 * Posts a single image to Threads, marked as a spoiler (blurred in the
 * feed until the reader taps to reveal — a native Threads feature since
 * mid-2025, exposed via is_spoiler_media on the media container).
 *
 * Carousel posting (cover + answers as 2 images) was tried first but hit
 * a permissions wall ("API access blocked") that plain single-image
 * posting doesn't — and spoiler-tagging the single answers image is
 * actually a better fit for "let people choose to see it" than a
 * carousel ever was, so this is the simpler, more reliable design.
 */
export async function postToThreads({ text, imageUrl }) {
  if (!config.threads.enabled) return { skipped: true, reason: "disabled" };
  const { userId, accessToken } = config.threads;
  if (!userId || !accessToken) {
    throw new Error("Missing THREADS_USER_ID or THREADS_ACCESS_TOKEN env vars.");
  }

  const containerParams = new URLSearchParams({
    text,
    access_token: accessToken,
    media_type: imageUrl ? "IMAGE" : "TEXT",
  });
  if (imageUrl) {
    containerParams.set("image_url", imageUrl);
    containerParams.set("is_spoiler_media", "true");
  }

  const containerRes = await fetch(`${GRAPH_BASE}/${userId}/threads?${containerParams}`, { method: "POST" });
  const containerData = await containerRes.json();
  if (!containerRes.ok) {
    throw new Error(`Threads container creation failed: ${JSON.stringify(containerData)}`);
  }

  // Meta recommends a short delay between container creation and publish.
  await new Promise((r) => setTimeout(r, 2000));

  const publishParams = new URLSearchParams({ creation_id: containerData.id, access_token: accessToken });
  const publishRes = await fetch(`${GRAPH_BASE}/${userId}/threads_publish?${publishParams}`, { method: "POST" });
  const publishData = await publishRes.json();
  if (!publishRes.ok) {
    throw new Error(`Threads publish failed: ${JSON.stringify(publishData)}`);
  }

  return { skipped: false, id: publishData.id };
}
