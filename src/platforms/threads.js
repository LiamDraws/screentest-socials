import { config } from "../config.js";

const GRAPH_BASE = "https://graph.threads.net/v1.0";

async function createItemContainer({ userId, accessToken, imageUrl }) {
  const params = new URLSearchParams({
    access_token: accessToken,
    media_type: "IMAGE",
    image_url: imageUrl,
    is_carousel_item: "true",
  });
  const res = await fetch(`${GRAPH_BASE}/${userId}/threads?${params}`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(`Threads carousel item container failed: ${JSON.stringify(data)}`);
  return data.id;
}

/**
 * Posts a Threads carousel: cover card + answers card, in that order.
 * Meta's carousel flow is three steps: create an item container per
 * image (is_carousel_item=true), create a parent container referencing
 * both as children, then publish the parent. Each image is passed as a
 * public URL (not uploaded bytes) — see publishPng.js for how that URL
 * gets hosted.
 */
export async function postToThreads({ text, imageUrls }) {
  if (!config.threads.enabled) return { skipped: true, reason: "disabled" };
  const { userId, accessToken } = config.threads;
  if (!userId || !accessToken) {
    throw new Error("Missing THREADS_USER_ID or THREADS_ACCESS_TOKEN env vars.");
  }

  let creationId;

  if (imageUrls?.length > 1) {
    // Carousel: create each item container, then a parent CAROUSEL container.
    const itemIds = [];
    for (const imageUrl of imageUrls) {
      itemIds.push(await createItemContainer({ userId, accessToken, imageUrl }));
      await new Promise((r) => setTimeout(r, 1500)); // small gap between item creations
    }

    const parentParams = new URLSearchParams({
      access_token: accessToken,
      media_type: "CAROUSEL",
      children: itemIds.join(","),
      text,
    });
    const parentRes = await fetch(`${GRAPH_BASE}/${userId}/threads?${parentParams}`, { method: "POST" });
    const parentData = await parentRes.json();
    if (!parentRes.ok) throw new Error(`Threads carousel parent container failed: ${JSON.stringify(parentData)}`);
    creationId = parentData.id;
  } else {
    // Single image (or text-only) fallback.
    const singleUrl = imageUrls?.[0];
    const params = new URLSearchParams({
      text,
      access_token: accessToken,
      media_type: singleUrl ? "IMAGE" : "TEXT",
    });
    if (singleUrl) params.set("image_url", singleUrl);

    const res = await fetch(`${GRAPH_BASE}/${userId}/threads?${params}`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(`Threads container creation failed: ${JSON.stringify(data)}`);
    creationId = data.id;
  }

  // Meta recommends a short delay between container creation and publish
  // — carousels need a bit longer since Meta has to process both items.
  await new Promise((r) => setTimeout(r, 3000));

  const publishParams = new URLSearchParams({ creation_id: creationId, access_token: accessToken });
  const publishRes = await fetch(`${GRAPH_BASE}/${userId}/threads_publish?${publishParams}`, { method: "POST" });
  const publishData = await publishRes.json();
  if (!publishRes.ok) throw new Error(`Threads publish failed: ${JSON.stringify(publishData)}`);

  return { skipped: false, id: publishData.id };
}
