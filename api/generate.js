/**
 * /api/generate.js (Vercel Serverless Function) - ESM
 *
 * Uses ONLY: jagilley/controlnet-depth-sdxl
 *
 * POST /api/generate
 *  - body: { image: <dataUrl or base64>, prompt?, negative_prompt?, ... }
 *  - returns 200 with outputUrl OR 202 with pollUrl
 *
 * GET /api/generate?id=<predictionId>
 *  - returns status + outputUrl when succeeded
 *
 * ENV (server-only):
 *  - REPLICATE_API_TOKEN (REQUIRED)
 */

const REPLICATE_API_BASE = "https://api.replicate.com/v1";

const MODEL_OWNER = "jagilley";
const MODEL_NAME = "controlnet-depth-sdxl";

// Default prompt: Starry Night vibe while preserving identity.
// (Avoid explicit ethnicity terms; preserve "identity, facial features, skin tone".)
const DEFAULT_PROMPT =
  "A textured oil painting in the style of Vincent van Gogh. Portrait of the same person from the input photo. Maintain the subject's identity, exact facial features, and skin tone. Preserve the original composition and clothing. Transform the background into the swirling blue and yellow sky patterns of 'The Starry Night'. Thick impasto brushwork.";

const DEFAULT_NEGATIVE =
  "text, watermark, logo, words, label, different face, face swap, change identity, distorted features, deformed, extra limbs, cartoon, low quality, blurry, artifacts, photorealistic, smooth";

// Warm cache for latest version id (best-effort)
let cachedVersion = { versionId: "", fetchedAt: 0 };

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
  const timer = setTimeout(() => controller.abort(), timeoutMs);

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
    clearTimeout(timer);
  }
}

async function getLatestVersionId(token) {
  const now = Date.now();
  if (cachedVersion.versionId && now - cachedVersion.fetchedAt < 6 * 60 * 60 * 1000) {
    return cachedVersion.versionId;
  }

  const model = await replicateFetch(`/models/${MODEL_OWNER}/${MODEL_NAME}`, { token, timeoutMs: 60000 });
  const versionId = model?.latest_version?.id;
  if (!versionId) throw new Error("Could not resolve latest_version.id");

  cachedVersion = { versionId, fetchedAt: now };
  return versionId;
}

async function createPrediction({ token, versionId, input }) {
  // POST /v1/predictions { version: <hash>, input: {...} }
  return replicateFetch(`/predictions`, {
    token,
    method: "POST",
    preferWaitSeconds: 45,
    timeoutMs: 60000,
    body: { version: versionId, input },
  });
}

async function fetchPrediction({ token, id }) {
  return replicateFetch(`/predictions/${id}`, { token, timeoutMs: 60000 });
}

/**
 * Replicate output can be:
 * - string URL
 * - array of URLs
 * - object(s)
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
    const candidates = [output.url, output.image, output.output, output.result, output.href, output.file];
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

function getQueryParam(req, key) {
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

async function pollWithinBudget({ token, id, budgetMs = 55000 }) {
  const started = Date.now();
  let delay = 900;

  while (true) {
    const p = await fetchPrediction({ token, id });

    if (p.status === "succeeded") return { done: true, prediction: p };

    if (p.status === "failed" || p.status === "canceled") {
      const err = new Error(p.error || "Prediction failed");
      err.httpStatus = 502;
      err.payload = p;
      throw err;
    }

    if (Date.now() - started > budgetMs) return { done: false, prediction: p };

    await sleep(delay);
    delay = Math.min(Math.floor(delay * 1.35), 3500);
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

  // GET: poll status
  if (req.method === "GET") {
    const id = getQueryParam(req, "id");
    if (!id) return sendJson(res, 400, { ok: false, error: "Missing query param: id" });

    try {
      const p = await fetchPrediction({ token, id });
      return sendJson(res, 200, {
        ok: true,
        predictionId: p.id,
        status: p.status,
        outputUrl: firstOutputUrl(p.output),
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

  // POST: create prediction
  if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "Method not allowed. Use POST." });

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
  }

  const {
    imageBase64,
    image, // your frontend sends `image`
    imageUrl,
    mimeType = "image/jpeg",

    prompt,
    negative_prompt,
    num_inference_steps,
    guidance_scale,
    strength,
    seed,
  } = body || {};

  const content = imageUrl || normalizeToDataUrl(imageBase64 || image, mimeType);
  if (!content) return sendJson(res, 400, { ok: false, error: "Provide imageUrl OR image/imageBase64." });

  try {
    const versionId = await getLatestVersionId(token);

    const input = {
      image: content,
      prompt: typeof prompt === "string" && prompt.trim() ? prompt : DEFAULT_PROMPT,
      negative_prompt:
        typeof negative_prompt === "string" && negative_prompt.trim() ? negative_prompt : DEFAULT_NEGATIVE,

      // model params (safe defaults)
      num_inference_steps: typeof num_inference_steps === "number" ? num_inference_steps : 35,
      guidance_scale: typeof guidance_scale === "number" ? guidance_scale : 12.0,
      strength: typeof strength === "number" ? strength : 0.8,
    };

    if (typeof seed === "number") input.seed = seed;

    const created = await createPrediction({ token, versionId, input });

    // Try to finish quickly within ~55s to avoid function timeout
    const polled = await pollWithinBudget({ token, id: created.id, budgetMs: 55000 });

    if (polled.done) {
      const done = polled.prediction;
      return sendJson(res, 200, {
        ok: true,
        model: `${MODEL_OWNER}/${MODEL_NAME}`,
        versionId,
        predictionId: done.id,
        status: done.status,
        outputUrl: firstOutputUrl(done.output),
        output: done.output,
      });
    }

    // Not done yet -> 202 + pollUrl
    return sendJson(res, 202, {
      ok: true,
      model: `${MODEL_OWNER}/${MODEL_NAME}`,
      versionId,
      predictionId: created.id,
      status: polled.prediction.status,
      pollUrl: `/api/generate?id=${encodeURIComponent(created.id)}`,
      message: "Processing. Poll pollUrl until status is succeeded.",
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
