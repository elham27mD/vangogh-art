/**
 * /api/generate.js (Vercel Serverless Function) - ESM
 *
 * Hybrid requirements per your request:
 * - Use the robust "editing flow" utilities from the NST/SDXL code:
 *   replicateFetch, getLatestVersionId, createPrediction, pollPrediction, firstOutputUrl, sendJson
 * - Keep the SAME image importing behavior from controlnet-depth-sdxl code:
 *   accept image | imageBase64 | imageUrl, normalizeToDataUrl()
 * - Use ONLY: jagilley/controlnet-depth-sdxl
 * - DEFAULT_STYLE_URL fixed to your hosted Starry Night image URL (used inside prompt reference).
 *
 * ENV REQUIRED:
 *   REPLICATE_API_TOKEN
 */

const REPLICATE_API_BASE = "https://api.replicate.com/v1";

const MODEL_OWNER = "jagilley";
const MODEL_NAME = "controlnet-depth-sdxl";

// As requested:
const DEFAULT_STYLE_URL = "https://www.elhamk23.art/style/Starry_Night.jpg";

// In-memory cache
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

// Keep image importing behavior (same idea as your depth-sdxl code)
function normalizeToDataUrl(value, mimeType = "image/jpeg") {
  if (!value || typeof value !== "string") return null;
  if (value.startsWith("data:")) return value;
  return `data:${mimeType};base64,${value}`;
}

// Robust fetch helper (from NST/SDXL code)
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
  // Same "create prediction" style as NST/SDXL code (POST /v1/predictions)
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

// Polling logic from NST/SDXL code
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

// Prompts: we reference your hosted Starry Night image in text (model is prompt-driven)
const DEFAULT_PROMPT =
  `A textured oil painting in the style of Vincent van Gogh's Starry Night. ` +
  `Keep the same person and identity from the input image. Maintain exact facial features and skin tone. ` +
  `Preserve composition and clothing. Impasto brushwork, swirling blue/yellow strokes. ` +
  `Style reference: ${DEFAULT_STYLE_URL}`;

const DEFAULT_NEGATIVE =
  "text, watermark, logo, words, label, different face, face swap, change identity, distorted features, deformed, extra limbs, cartoon, low quality, blurry, artifacts, photorealistic, smooth";

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
    // keep image importing behavior
    imageBase64,
    image, // alias
    imageUrl,
    mimeType = "image/jpeg",

    // allow prompt overrides from frontend if you want
    prompt,
    negative_prompt,

    // controlnet params
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

    const input = {
      image: content,

      // prompt logic (from your good code idea, but safe defaults)
      prompt: typeof prompt === "string" && prompt.trim() ? prompt : DEFAULT_PROMPT,
      negative_prompt:
        typeof negative_prompt === "string" && negative_prompt.trim()
          ? negative_prompt
          : DEFAULT_NEGATIVE,

      num_inference_steps: typeof num_inference_steps === "number" ? num_inference_steps : 35,
      guidance_scale: typeof guidance_scale === "number" ? guidance_scale : 12.0,
      strength: typeof strength === "number" ? strength : 0.8,
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
      styleRef: DEFAULT_STYLE_URL,
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
