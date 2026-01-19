/**
 * /api/generate.js (Vercel Serverless Function) - ESM
 *
 * Key fixes:
 * - ESM export (because package.json has "type":"module")
 * - No Wikimedia default (Replicate can 403 fetching it). Requires styleUrl/styleBase64 or DEFAULT_STYLE_URL env.
 * - Async-safe: returns 202 with predictionId if processing takes too long (avoids Vercel timeouts / aborts).
 * - GET endpoint to poll status: /api/generate?id=...
 *
 * ENV REQUIRED:
 *   REPLICATE_API_TOKEN = r8_...
 *
 * ENV OPTIONAL:
 *   DEFAULT_STYLE_URL = https://www.elhamk23.art/style/Starry_Night.jpg
 */

const REPLICATE_API_BASE = "https://api.replicate.com/v1";

// Community NST models (require version hash; fetch latest dynamically)
const NST_PRIMARY = { owner: "huage001", name: "adaattn" };
const NST_FALLBACK = { owner: "nkolkin13", name: "neuralneighborstyletransfer" };

// Official SDXL model (optional fallback)
const SDXL_OFFICIAL = "stability-ai/sdxl";

// In-memory cache (warm lambda reuse only)
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

function normalizeToDataUrl(maybeBase64, mimeType = "image/jpeg") {
  if (!maybeBase64 || typeof maybeBase64 !== "string") return null;
  if (maybeBase64.startsWith("data:")) return maybeBase64;
  return `data:${mimeType};base64,${maybeBase64}`;
}

async function replicateFetch(path, { token, method = "GET", body, timeoutMs = 45000, preferWaitSeconds } = {}) {
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

  // Cache for 6 hours
  if (
    cachedLatestVersion.key === key &&
    cachedLatestVersion.versionId &&
    now - cachedLatestVersion.fetchedAt < 6 * 60 * 60 * 1000
  ) {
    return cachedLatestVersion.versionId;
  }

  const model = await replicateFetch(`/models/${owner}/${name}`, { token, timeoutMs: 45000 });
  const versionId = model?.latest_version?.id;
  if (!versionId) throw new Error(`Could not resolve latest_version.id for ${key}`);

  cachedLatestVersion = { key, versionId, fetchedAt: now };
  return versionId;
}

async function createPredictionByVersion({ version, input, token }) {
  // Community models: POST /v1/predictions with {version:"owner/name:hash", input:{}}
  return replicateFetch(`/predictions`, {
    token,
    method: "POST",
    preferWaitSeconds: 45,
    body: { version, input },
    timeoutMs: 45000,
  });
}

async function createPredictionByOfficialModel({ model, input, token }) {
  // Official endpoint: POST /v1/models/{owner}/{name}/predictions with {input:{}}
  return replicateFetch(`/models/${model}/predictions`, {
    token,
    method: "POST",
    preferWaitSeconds: 45,
    body: { input },
    timeoutMs: 45000,
  });
}

async function fetchPrediction(id, token) {
  return replicateFetch(`/predictions/${id}`, { token, timeoutMs: 45000 });
}

/**
 * Replicate output may be:
 * - string URL
 * - array of URLs
 * - object with {image|url|output|...}
 * - array of objects
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

async function pollPredictionUntil({ id, token, timeBudgetMs = 55000 }) {
  const started = Date.now();
  let delay = 900;

  while (true) {
    const p = await fetchPrediction(id, token);

    if (p.status === "succeeded") return { done: true, prediction: p };
    if (p.status === "failed" || p.status === "canceled") {
      const err = new Error(p.error || "Prediction failed");
      err.httpStatus = 502;
      err.payload = p;
      throw err;
    }

    if (Date.now() - started > timeBudgetMs) {
      return { done: false, prediction: p };
    }

    await sleep(delay);
    delay = Math.min(Math.floor(delay * 1.35), 3500);
  }
}

function getQueryParam(req, key) {
  // Vercel Node req may have req.query; but safe fallback:
  try {
    if (req.query && req.query[key]) return req.query[key];
  } catch {}
  try {
    const u = new URL(req.url, "http://localhost");
    return u.searchParams.get(key);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.end();

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return sendJson(res, 500, { ok: false, error: "Missing REPLICATE_API_TOKEN env var." });

  // ---------- GET: polling endpoint ----------
  if (req.method === "GET") {
    const id = getQueryParam(req, "id");
    if (!id) return sendJson(res, 400, { ok: false, error: "Missing query param: id" });

    try {
      const p = await fetchPrediction(id, token);
      const outputUrl = firstOutputUrl(p.output);

      return sendJson(res, 200, {
        ok: true,
        predictionId: p.id,
        status: p.status,
        outputUrl,
        output: p.output ?? null,
        error: p.error ?? null,
      });
    } catch (err) {
      const status = err.httpStatus && Number.isInteger(err.httpStatus) ? err.httpStatus : 500;
      return sendJson(res, status, {
        ok: false,
        error: err.message || "Server error",
        replicateStatus: err.httpStatus || null,
        replicatePayload: err.payload || null,
      });
    }
  }

  // ---------- POST: create & (try) return result ----------
  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, error: "Method not allowed. Use POST." });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
  }

  const {
    // Content image
    imageBase64,
    image, // alias (your frontend currently sends `image`)
    imageUrl,
    mimeType = "image/jpeg",

    // Style image (required unless DEFAULT_STYLE_URL is set)
    styleUrl,
    styleBase64,

    // Mode
    mode = "nst",

    // SDXL overrides (optional)
    sdxlPrompt,
    sdxlNegativePrompt,
    promptStrength,
    guidanceScale,
    numInferenceSteps,
    seed,
  } = body || {};

  const content = imageUrl || normalizeToDataUrl(imageBase64 || image, mimeType);
  if (!content) {
    return sendJson(res, 400, { ok: false, error: "Provide imageUrl OR image/imageBase64 (data URL or base64)." });
  }

  const envDefaultStyle = process.env.DEFAULT_STYLE_URL || null;
  const style = styleUrl || normalizeToDataUrl(styleBase64, "image/jpeg") || envDefaultStyle;

  if (!style) {
    return sendJson(res, 400, {
      ok: false,
      error: "Missing style image. Provide styleUrl/styleBase64 OR set DEFAULT_STYLE_URL in Vercel env.",
    });
  }

  try {
    let created;

    // SDXL fallback
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
        prompt_strength: typeof promptStrength === "number" ? promptStrength : 0.22,
        guidance_scale: typeof guidanceScale === "number" ? guidanceScale : 6.5,
        num_inference_steps: typeof numInferenceSteps === "number" ? numInferenceSteps : 30,
      };
      if (typeof seed === "number") input.seed = seed;

      created = await createPredictionByOfficialModel({ model: SDXL_OFFICIAL, input, token });
    } else {
      // NST default (content-preserving)
      let modelUsed = NST_PRIMARY;
      let versionId;

      try {
        versionId = await getLatestVersionId(NST_PRIMARY.owner, NST_PRIMARY.name, token);
      } catch {
        modelUsed = NST_FALLBACK;
        versionId = await getLatestVersionId(NST_FALLBACK.owner, NST_FALLBACK.name, token);
      }

      const version = `${modelUsed.owner}/${modelUsed.name}:${versionId}`;
      const input = { content, style };

      created = await createPredictionByVersion({ version, input, token });
      created._modelUsed = `${modelUsed.owner}/${modelUsed.name}`;
    }

    // Try to finish within a safe time budget (avoid Vercel timeouts)
    const timeBudgetMs = 55000; // ~55s
    const polled = await pollPredictionUntil({ id: created.id, token, timeBudgetMs });

    if (polled.done) {
      const done
