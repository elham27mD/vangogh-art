/**
 * /api/generate.js  (Vercel Serverless Function)
 *
 * Default mode: Neural Style Transfer (NST) to preserve content structure (thobe/face/edges)
 * Optional mode: SDXL img2img fallback with conservative prompt_strength to reduce hallucinations
 *
 * Required env:
 *   REPLICATE_API_TOKEN = r8_...
 */

const REPLICATE_API_BASE = "https://api.replicate.com/v1";

// Public-domain Starry Night reference image (Wikimedia)
const DEFAULT_STARRY_NIGHT_STYLE_URL =
  "https://upload.wikimedia.org/wikipedia/commons/d/de/Vincent_van_Gogh_Starry_Night.jpg";

// Community NST models (need version hash). We resolve latest version dynamically.
const NST_PRIMARY = { owner: "huage001", name: "adaattn" };
const NST_FALLBACK = { owner: "nkolkin13", name: "neuralneighborstyletransfer" };

// Official SDXL model endpoint (no version hash needed when using /v1/models/{owner}/{name}/predictions)
const SDXL_OFFICIAL = "stability-ai/sdxl";

// In-memory cache (warm lambda reuse only)
let cachedLatestVersion = {
  key: "",
  versionId: "",
  fetchedAt: 0,
};

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeToDataUrl(imageBase64, mimeType = "image/jpeg") {
  if (!imageBase64 || typeof imageBase64 !== "string") return null;
  if (imageBase64.startsWith("data:")) return imageBase64;
  return `data:${mimeType};base64,${imageBase64}`;
}

async function replicateFetch(
  path,
  { token, method = "GET", body, timeoutMs = 30000, preferWaitSeconds } = {}
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

async function getLatestVersionId(owner, name, token) {
  const key = `${owner}/${name}`;
  const now = Date.now();

  // Cache for 6 hours (best-effort)
  if (
    cachedLatestVersion.key === key &&
    cachedLatestVersion.versionId &&
    now - cachedLatestVersion.fetchedAt < 6 * 60 * 60 * 1000
  ) {
    return cachedLatestVersion.versionId;
  }

  const model = await replicateFetch(`/models/${owner}/${name}`, {
    token,
    timeoutMs: 30000,
  });

  const versionId = model?.latest_version?.id;
  if (!versionId) throw new Error(`Could not resolve latest_version.id for ${key}`);

  cachedLatestVersion = { key, versionId, fetchedAt: now };
  return versionId;
}

async function createPredictionByVersion({ version, input, token }) {
  // Community models: POST /v1/predictions with {version: "...:hash", input:{...}}
  return replicateFetch(`/predictions`, {
    token,
    method: "POST",
    preferWaitSeconds: 60,
    body: { version, input },
    timeoutMs: 30000,
  });
}

async function createPredictionByOfficialModel({ model, input, token }) {
  // Official model endpoint: POST /v1/models/{owner}/{name}/predictions
  return replicateFetch(`/models/${model}/predictions`, {
    token,
    method: "POST",
    preferWaitSeconds: 60,
    body: { input },
    timeoutMs: 30000,
  });
}

async function pollPrediction(prediction, token, { maxWaitMs = 3 * 60 * 1000 } = {}) {
  const started = Date.now();
  let delay = 750;
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

    current = await replicateFetch(`/predictions/${current.id}`, {
      token,
      timeoutMs: 30000,
    });
  }
}

/**
 * Replicate output may be:
 * - string URL
 * - array of string URLs
 * - object like { image: "url" } or { output: "url" }
 * - array of objects like [{ url: "..." }, { image: "..." }]
 * This tries hard to extract the first usable URL.
 */
function firstOutputUrl(output) {
  if (!output) return null;

  // direct string
  if (typeof output === "string") return output;

  // array
  if (Array.isArray(output)) {
    for (const item of output) {
      const u = firstOutputUrl(item);
      if (u) return u;
    }
    return null;
  }

  // object
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

    // last resort: scan nested values
    for (const v of Object.values(output)) {
      if (typeof v === "string" && v.startsWith("http")) return v;
      const u = firstOutputUrl(v);
      if (u) return u;
    }
  }

  return null;
}

module.exports = async function handler(req, res) {
  // CORS (adjust origin if needed)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.end();

  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed. Use POST." });

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return sendJson(res, 500, { error: "Missing REPLICATE_API_TOKEN env var." });

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return sendJson(res, 400, { error: "Invalid JSON body." });
  }

  const {
    // Content image (support both new and old keys)
    imageBase64,
    image, // ✅ alias قديم (لأنه عندك الفرونت يرسل image)
    imageUrl,
    mimeType = "image/jpeg",

    // Style image (NST)
    styleUrl = DEFAULT_STARRY_NIGHT_STYLE_URL,
    styleBase64,

    // Mode: "nst" (default) or "sdxl"
    mode = "nst",

    // SDXL optional overrides
    sdxlPrompt,
    sdxlNegativePrompt,
    promptStrength,
    guidanceScale,
    numInferenceSteps,
    seed,
  } = body || {};

  // ✅ accept imageUrl OR (imageBase64/image) as data URL/base64
  const content = imageUrl || normalizeToDataUrl(imageBase64 || image, mimeType);
  if (!content) {
    return sendJson(res, 400, { error: "Provide imageBase64/image (data URL or base64) or imageUrl." });
  }

  const style =
    styleUrl || normalizeToDataUrl(styleBase64, "image/jpeg") || DEFAULT_STARRY_NIGHT_STYLE_URL;

  try {
    // ---------- SDXL fallback (optional) ----------
    if (mode === "sdxl") {
      const prompt =
        sdxlPrompt ||
        "same subject and composition as the input photo, preserve exact silhouette, folds, edges and facial structure, render with thick oil paint impasto and swirling brushstrokes inspired by Vincent van Gogh's The Starry Night, vivid blues and yellows";

      const negative =
        sdxlNegativePrompt ||
        "text, watermark, logo, words, label, bottle, perfume, product, face swap, different person, deformed, extra limbs, cartoon, low quality, blurry, artifacts";

      const input = {
        prompt,
        negative_prompt: negative,
        image: content,

        // Keep LOW to preserve content. High values cause hallucination/morphing.
        prompt_strength: typeof promptStrength === "number" ? promptStrength : 0.22,
        guidance_scale: typeof guidanceScale === "number" ? guidanceScale : 6.5,
        num_inference_steps: typeof numInferenceSteps === "number" ? numInferenceSteps : 30,
      };

      if (typeof seed === "number") input.seed = seed;

      const created = await createPredictionByOfficialModel({
        model: SDXL_OFFICIAL,
        input,
        token,
      });

      const done = await pollPrediction(created, token, { maxWaitMs: 4 * 60 * 1000 });
      const outputUrl = firstOutputUrl(done.output);

      return sendJson(res, 200, {
        mode: "sdxl",
        predictionId: done.id,
        status: done.status,
        outputUrl,
        output: done.output,
      });
    }

    // ---------- Default: NST (content-preserving) ----------
    let modelUsed = NST_PRIMARY;
    let versionId;

    try {
      versionId = await getLatestVersionId(NST_PRIMARY.owner, NST_PRIMARY.name, token);
    } catch (e) {
      modelUsed = NST_FALLBACK;
      versionId = await getLatestVersionId(NST_FALLBACK.owner, NST_FALLBACK.name, token);
    }

    const version = `${modelUsed.owner}/${modelUsed.name}:${versionId}`;

    // Most NST models accept content/style inputs
    const input = { content, style };

    const created = await createPredictionByVersion({ version, input, token });
    const done = await pollPrediction(created, token, { maxWaitMs: 3 * 60 * 1000 });

    const outputUrl = firstOutputUrl(done.output);

    // ✅ Return outputUrl explicitly so frontend can always use it
    return sendJson(res, 200, {
      mode: "nst",
      model: `${modelUsed.owner}/${modelUsed.name}`,
      predictionId: done.id,
      status: done.status,
      outputUrl,
      output: done.output,
      styleUsed: style,
    });
  } catch (err) {
    const status =
      err.httpStatus && Number.isInteger(err.httpStatus) ? err.httpStatus : 500;
    return sendJson(res, status, {
      error: err.message || "Server error",
      replicateStatus: err.httpStatus || null,
      replicatePayload: err.payload || null,
    });
  }
};
