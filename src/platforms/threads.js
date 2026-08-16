import { config } from "../config.js";

const GRAPH_BASE = "https://graph.threads.net/v1.0";

/**
 * Threads posts via Meta's Graph API in two steps: create a media
 * container, then publish it. Unlike Bluesky/X, Threads takes the image
 * as a public URL directly rather than an uploaded file — so this
 * function expects `imageUrl`, not a downloaded buffer.
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
  if (imageUrl) containerParams.set("image_url", imageUrl);

  const containerRes = await fetch(`${GRAPH_BASE}/${userId}/threads?${containerParams}`, {
    method: "POST",
  });
  const containerData = await containerRes.json();
  if (!containerRes.ok) {
    throw new Error(`Threads container creation failed: ${JSON.stringify(containerData)}`);
  }

  // Meta recommends a short delay between container creation and publish.
  await new Promise((r) => setTimeout(r, 2000));

  const publishParams = new URLSearchParams({
    creation_id: containerData.id,
    access_token: accessToken,
  });
  const publishRes = await fetch(`${GRAPH_BASE}/${userId}/threads_publish?${publishParams}`, {
    method: "POST",
  });
  const publishData = await publishRes.json();
  if (!publishRes.ok) {
    throw new Error(`Threads publish failed: ${JSON.stringify(publishData)}`);
  }

  return { skipped: false, id: publishData.id };
}
