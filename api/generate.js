/**
 * /api/generate.js
 * MODEL: zsxkib/instant-id
 * This is the correct PUBLIC model for InstantID on Replicate.
 */

const REPLICATE_API_BASE = "https://api.replicate.com/v1";
// CORRECT MODEL COORDINATES:
const MODEL_OWNER = "zsxkib";
const MODEL_NAME = "instant-id";

let cachedLatestVersion = { key: "", versionId: "", fetchedAt: 0 };

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeToDataUrl(value, mimeType = "image/jpeg") {
  if (!value || typeof value !== "string") return null;
  if (value.startsWith("data:")) return value;
  return `data:${mimeType};base64,${value}`;
}

async function replicateFetch(path, { token, method = "GET", body, timeoutMs = 60000, preferWaitSeconds } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    if (preferWaitSeconds != null) headers.Prefer = `wait=${preferWaitSeconds}`;

    const resp = await fetch(`${REPLICATE_API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await resp.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (!resp.ok) {
      const msg = (data && data.detail) || (data && data.error) || "Replicate API error";
      const err = new Error(msg);
      err.httpStatus = resp.status;
      throw err;
    }
    return data;
  } finally { clearTimeout(t); }
}

async function getLatestVersionId(token) {
  const key = `${MODEL_OWNER}/${MODEL_NAME}`;
  const now = Date.now();
  if (cachedLatestVersion.key === key && now - cachedLatestVersion.fetchedAt < 6 * 3600 * 1000) {
    return cachedLatestVersion.versionId;
  }
  const model = await replicateFetch(`/models/${MODEL_OWNER}/${MODEL_NAME}`, { token });
  const versionId = model?.latest_version?.id;
  if (!versionId) throw new Error(`Could not find version ID for ${key}`);
  cachedLatestVersion = { key, versionId, fetchedAt: now };
  return versionId;
}

function firstOutputUrl(output) {
  if (!output) return null;
  if (typeof output === "string") return output;
  if (Array.isArray(output)) return firstOutputUrl(output[0]);
  return null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.end();

  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST" });

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return sendJson(res, 500, { error: "Missing API Token" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const content = body.imageUrl || normalizeToDataUrl(body.imageBase64 || body.image);
    
    if (!content) return sendJson(res, 400, { error: "No image provided" });

    const versionId = await getLatestVersionId(token);

    // INPUT SCHEMA FOR zsxkib/instant-id
    const input = {
      image: content, // This model uses 'image', NOT 'face_image'
      
      prompt: "oil painting by Vincent Van Gogh, Starry Night style, thick impasto brushstrokes, swirling blue and yellow sky, expressionist masterpiece, vibrant colors, textured canvas",
      negative_prompt: "photo, realistic, photography, camera, smooth, flat, low quality, distorted face",
      
      // Style Strength Settings
      ip_adapter_scale: 0.8,
      controlnet_conditioning_scale: 0.8,
      
      num_inference_steps: 30,
      guidance_scale: 5,
    };

    const prediction = await replicateFetch("/predictions", {
      token,
      method: "POST",
      body: { version: versionId, input },
      preferWaitSeconds: 5
    });

    let current = prediction;
    while (current.status !== "succeeded" && current.status !== "failed" && current.status !== "canceled") {
      await sleep(1000);
      current = await replicateFetch(`/predictions/${current.id}`, { token });
    }

    if (current.status !== "succeeded") {
      throw new Error(`Generation failed: ${current.error}`);
    }

    return sendJson(res, 200, {
      outputUrl: firstOutputUrl(current.output),
      status: "succeeded"
    });

  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { error: err.message });
  }
}
