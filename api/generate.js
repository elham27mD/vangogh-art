/**
 * /api/generate.js (Vercel Serverless Function) - ESM
 *
 * ENV:
 *   REPLICATE_API_TOKEN = r8_...
 * Optional:
 *   DEFAULT_STYLE_URL = https://www.elhamk23.art/style/Starry_Night.jpg
 */

const REPLICATE_API_BASE = "https://api.replicate.com/v1";

const NST_PRIMARY = { owner: "huage001", name: "adaattn" };
const NST_FALLBACK = { owner: "nkolkin13", name: "neuralneighborstyletransfer" };
const SDXL_OFFICIAL = "stability-ai/sdxl";

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

async function replicateFetch(path, { token, method = "GET", body, timeoutMs = 45000, preferWaitSeconds } = {}) {
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

async function getLatestVersionId(owner, name, token) {
  const key = `${owner}/${name}`;
  const now = Date.now();

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
  return replicateFetch(`/predictions`, {
    token,
    method: "POST",
    preferWaitSeconds: 45,
    body: { version, input },
    timeoutMs: 45000,
  });
}

async function createPredictionByOfficialModel({ model, input, token }) {
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

async function pollWithinBudget(id, token, budgetMs) {
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

  // GET: poll
  if (req.method === "GET") {
    const id = getQueryParam(req, "id");
    if (!id) return sendJson(res, 400, { ok: false, error: "Missing query param: id" });

    try {
      const p = await fetchPrediction(id, token);
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

  // POST: create
  if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "Method not allowed. Use POST." });

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
  }

  const {
    imageBase64,
    image, // alias
    imageUrl,
    mimeType = "image/jpeg",
    styleUrl,
    styleBase64,
    mode = "nst",
    sdxlPrompt,
    sdxlNegativePrompt,
    promptStrength,
    guidanceScale,
    numInferenceSteps,
    seed,
  } = body || {};

  const content = imageUrl || normalizeToDataUrl(imageBase64 || image, mimeType);
  if (!content) return sendJson(res, 400, { ok: false, error: "Provide imageUrl OR image/imageBase64." });

  const envDefaultStyle = process.env.DEFAULT_STYLE_URL || null;
  const style = styleUrl || normalizeToDataUrl(styleBase64, "image/jpeg") || envDefaultStyle;

  if (!style) {
    return sendJson(res, 400, {
      ok: false,
      error: "Missing style. Provide styleUrl/styleBase64 OR set DEFAULT_STYLE_URL.",
    });
  }

  try {
    let created = null;
    let modelUsed = null;

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
      modelUsed = SDXL_OFFICIAL;
    } else {
      let vId = null;

      try {
        vId = await getLatestVersionId(NST_PRIMARY.owner, NST_PRIMARY.name, token);
        modelUsed = `${NST_PRIMARY.owner}/${NST_PRIMARY.name}`;
      } catch {
        vId = await getLatestVersionId(NST_FALLBACK.owner, NST_FALLBACK.name, token);
        modelUsed = `${NST_FALLBACK.owner}/${NST_FALLBACK.name}`;
      }

      const version = `${modelUsed}:${vId}`;
      const input = { content, style };

      created = await createPredictionByVersion({ version, input, token });
    }

    // Try to finish within ~55s, otherwise return 202 for frontend polling
    const polled = await pollWithinBudget(created.id, token, 55000);

    if (polled.done) {
      const done = polled.prediction;
      return sendJson(res, 200, {
        ok: true,
        mode,
        model: modelUsed,
        predictionId: done.id,
        status: done.status,
        outputUrl: firstOutputUrl(done.output),
        output: done.output,
      });
    }

    return sendJson(res, 202, {
      ok: true,
      mode,
      model: modelUsed,
      predictionId: created.id,
      status: polled.prediction.status,
      pollUrl: `/api/generate?id=${encodeURIComponent(created.id)}`,
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
