/**
 * /api/generate.js (Vercel Serverless Function) - ESM
 *
 * Uses ONLY: jagilley/controlnet-depth-sdxl
 * - Dynamic latest version id (avoids version rot)
 * - Robust Replicate fetch + polling
 * - Keeps SAME image importing behavior:
 *    accepts image | imageBase64 | imageUrl, with normalizeToDataUrl()
 *
 * Goal: Strong "Starry Night" vibe (not washed out) while preserving identity/structure.
 *
 * ENV REQUIRED:
 *   REPLICATE_API_TOKEN
 */

const REPLICATE_API_BASE = "https://api.replicate.com/v1";

const MODEL_OWNER = "jagilley";
const MODEL_NAME = "controlnet-depth-sdxl";

// Warm cache for latest version id (best-effort)
let cachedLatestVersion = {
  key: "",
  versionId: "",
  fetchedAt: 0,
};

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Keep image importing behavior
function normalizeToDataUrl(value, mimeType = "image/jpeg") {
  if (!value || typeof value !== "string") return null;
  if (value.startsWith("data:")) return value;
  return `data:${mimeType};base64,${value}`;
}

async function replicateFetch(
  path,
  { token, method = "GET", body, timeoutMs = 60000, preferWaitSeconds } = {}
) {
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
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!resp.ok) {
      const msg =
        (data && data.detail) ||
        (data && data.error) ||
        (typeof data === "string" ? data : "Replicate API error");
      const err = new Error(msg);
      err.httpStatus = resp.status;
      err.payload = data;
      throw err;
    }

    return data;
  } finally {
    clearTimeout(t);
  }
}

async function getLatestVersionId(token) {
  const key = `${MODEL_OWNER}/${MODEL_NAME}`;
  const now = Date.now();

  // Cache for 6 hours
  if (
    cachedLatestVersion.key === key &&
    cachedLatestVersion.versionId &&
    now - cachedLatestVersion.fetchedAt < 6 * 60 * 60 * 1000
  ) {
    return cachedLatestVersion.versionId;
  }

  const model = await replicateFetch(`/models/${MODEL_OWNER}/${MODEL_NAME}`, {
    token,
    timeoutMs: 60000,
  });

  const versionId = model?.latest_version?.id;
  if (!versionId) throw new Error(`Could not resolve latest_version.id for ${key}`);

  cachedLatestVersion = { key, versionId, fetchedAt: now };
  return versionId;
}

async function createPrediction({ token, versionId, input }) {
  return replicateFetch(`/predictions`, {
    token,
    method: "POST",
    preferWaitSeconds: 60,
    body: { version: versionId, input },
    timeoutMs: 60000,
  });
}

async function fetchPrediction({ token, id }) {
  return replicateFetch(`/predictions/${id}`, { token, timeoutMs: 60000 });
}

async function pollPrediction(prediction, token, { maxWaitMs = 8 * 60 * 1000 } = {}) {
  const started = Date.now();
  let delay = 900;
  let current = prediction;

  while (true) {
    if (!current) throw new Error("Prediction missing");

    if (current.status === "succeeded") return current;

    if (current.status === "failed" || current.status === "canceled") {
      const err = new Error(current.error || "Prediction failed");
      err.httpStatus = 502;
      err.payload = current;
      throw err;
    }

    if (Date.now() - started > maxWaitMs) {
      const err = new Error("Prediction timed out");
      err.httpStatus = 504;
      err.payload = current;
      throw err;
    }

    await sleep(delay);
    delay = Math.min(Math.floor(delay * 1.35), 4000);

    current = await fetchPrediction({ token, id: current.id });
  }
}

/**
 * Replicate output may be:
 * - string URL
 * - array of string URLs
 * - objects / nested
 */
function firstOutputUrl(output) {
  if (!output) return null;

  if (typeof output === "string") return output;

  if (Array.isArray(output)) {
    for (const item of output) {
      const u = firstOutputUrl(item);
      if (u) return u;
    }
    return null;
  }

  if (typeof output === "object") {
    const candidates = [
      output.url,
      output.image,
      output.output,
      output.result,
      output.href,
      output.file,
      output.files,
      output.images,
      output.results,
    ];

    for (const c of candidates) {
      const u = firstOutputUrl(c);
      if (u) return u;
    }

    for (const v of Object.values(output)) {
      if (typeof v === "string" && v.startsWith("http")) return v;
      const u = firstOutputUrl(v);
      if (u) return u;
    }
  }

  return null;
}

// -----------------------------
// STYLE PROMPTS (VIVID, NOT WASHED OUT)
// -----------------------------
const DEFAULT_PROMPT =
  "Vincent van Gogh Starry Night style oil painting, highly saturated vivid colors, high contrast. " +
  "Deep cobalt and ultramarine blues, bright warm yellow highlights, glowing stars, swirling sky strokes. " +
  "Thick impasto texture, heavy visible brushwork, painterly. " +
  "Preserve the exact subject identity, facial features, skin tone, clothing shape and folds, and the original composition. " +
  "Do NOT make it a sketch; make it rich colorful oil paint.";

const DEFAULT_NEGATIVE =
  "desaturated, muted colors, low contrast, gray, dull, washed out, flat lighting, " +
  "pencil, sketch, lineart, charcoal, watercolor, pastel, anime, cartoon, " +
  "photorealistic, realistic photo, smooth skin, airbrushed, CGI, 3d render, " +
  "text, watermark, logo, words, label, change identity, different face, face swap, different person, " +
  "deformed, distorted features, extra limbs, blurry, low quality, artifacts";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.end();

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed. Use POST." });
  }

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return sendJson(res, 500, { error: "Missing REPLICATE_API_TOKEN env var." });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return sendJson(res, 400, { error: "Invalid JSON body." });
  }

  const {
    // image importing behavior
    imageBase64,
    image, // alias
    imageUrl,
    mimeType = "image/jpeg",

    // allow overrides from frontend
    prompt,
    negative_prompt,

    // controlnet params overrides
    num_inference_steps,
    guidance_scale,
    strength,
    seed,
  } = body || {};

  const content = imageUrl || normalizeToDataUrl(imageBase64 || image, mimeType);
  if (!content) {
    return sendJson(res, 400, { error: "Provide image (data URL/base64) or imageUrl." });
  }

  try {
    const versionId = await getLatestVersionId(token);

    // Defaults tuned to FIX "washed out":
    // - steps 40, guidance 13, strength 0.48
    const input = {
      image: content,

      prompt: typeof prompt === "string" && prompt.trim() ? prompt : DEFAULT_PROMPT,
      negative_prompt:
        typeof negative_prompt === "string" && negative_prompt.trim()
          ? negative_prompt
          : DEFAULT_NEGATIVE,

      num_inference_steps: typeof num_inference_steps === "number" ? num_inference_steps : 40,
      guidance_scale: typeof guidance_scale === "number" ? guidance_scale : 13.0,

      // IMPORTANT: lower strength -> more stylization
      // If too distorted: raise toward 0.58. If still weak: lower toward 0.42.
      strength: typeof strength === "number" ? strength : 0.48,
    };

    if (typeof seed === "number") input.seed = seed;

    const created = await createPrediction({ token, versionId, input });
    const done = await pollPrediction(created, token, { maxWaitMs: 8 * 60 * 1000 });

    const outputUrl = firstOutputUrl(done.output);

    return sendJson(res, 200, {
      mode: "controlnet-depth-sdxl",
      model: `${MODEL_OWNER}/${MODEL_NAME}`,
      versionId,
      predictionId: done.id,
      status: done.status,
      outputUrl,
      output: done.output,
      used: {
        strength: input.strength,
        guidance_scale: input.guidance_scale,
        num_inference_steps: input.num_inference_steps,
      },
    });
  } catch (err) {
    const status = err.httpStatus && Number.isInteger(err.httpStatus) ? err.httpStatus : 500;
    return sendJson(res, status, {
      error: err.message || "Server error",
      replicateStatus: err.httpStatus || null,
      replicatePayload: err.payload || null,
    });
  }
}
