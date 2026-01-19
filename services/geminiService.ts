/**
 * /api/generate.js  (Vercel Serverless Function)
 *
 * Mode: Neural Style Transfer (NST) - The best for preserving structure.
 */

const REPLICATE_API_BASE = "https://api.replicate.com/v1";

// Public-domain Starry Night reference image
const DEFAULT_STARRY_NIGHT_STYLE_URL =
  "https://upload.wikimedia.org/wikipedia/commons/d/de/Vincent_van_Gogh_Starry_Night.jpg";

// Community NST models
const NST_PRIMARY = { owner: "huage001", name: "adaattn" };
const NST_FALLBACK = { owner: "nkolkin13", name: "neuralneighborstyletransfer" };

const SDXL_OFFICIAL = "stability-ai/sdxl";

// Cache for version IDs
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

async function replicateFetch(path, { token, method = "GET", body, timeoutMs = 30000, preferWaitSeconds } = {}) {
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

  if (cachedLatestVersion.key === key && cachedLatestVersion.versionId && now - cachedLatestVersion.fetchedAt < 6 * 60 * 60 * 1000) {
    return cachedLatestVersion.versionId;
  }

  const model = await replicateFetch(`/models/${owner}/${name}`, { token, timeoutMs: 30000 });
  const versionId = model?.latest_version?.id;

  if (!versionId) throw new Error(`Could not resolve latest_version.id for ${key}`);

  cachedLatestVersion = { key, versionId, fetchedAt: now };
  return versionId;
}

async function createPredictionByVersion({ version, input, token }) {
  return replicateFetch(`/predictions`, {
    token,
    method: "POST",
    preferWaitSeconds: 60,
    body: { version, input },
    timeoutMs: 30000,
  });
}

async function createPredictionByOfficialModel({ model, input, token }) {
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

    current = await replicateFetch(`/predictions/${current.id}`, { token, timeoutMs: 30000 });
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
    const candidates = [output.url, output.image, output.output, output.result];
    for (const c of candidates) {
      const u = firstOutputUrl(c);
      if (u) return u;
    }
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.end();

  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed. Use POST." });

  // ✅ تم التعديل: استخدام REPLICATE_API_TOKEN
  const token = process.env.REPLICATE_API_TOKEN;
  
  if (!token) return sendJson(res, 500, { error: "Missing REPLICATE_API_TOKEN env var." });

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return sendJson(res, 400, { error: "Invalid JSON body." });
  }

  const {
    imageBase64,
    imageUrl,
    mimeType = "image/jpeg",
    styleUrl = DEFAULT_STARRY_NIGHT_STYLE_URL,
    styleBase64,
    mode = "nst", 
    sdxlPrompt,
    sdxlNegativePrompt,
    promptStrength,
    guidanceScale,
    numInferenceSteps,
    seed,
  } = body || {};

  const content = imageUrl || normalizeToDataUrl(imageBase64, mimeType);
  if (!content) return sendJson(res, 400, { error: "Provide imageBase64 (data URL or base64) or imageUrl." });

  const style = styleUrl || normalizeToDataUrl(styleBase64, "image/jpeg") || DEFAULT_STARRY_NIGHT_STYLE_URL;

  try {
    // --- SDXL Logic ---
    if (mode === "sdxl") {
      const prompt = sdxlPrompt || "Vincent Van Gogh Style";
      const negative = sdxlNegativePrompt || "low quality";
      const input = {
        prompt,
        negative_prompt: negative,
        image: content,
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
        output: outputUrl, 
        rawOutput: done.output
      });
    }

    // --- NST Logic ---
    let modelUsed = NST_PRIMARY;
    let versionId;

    try {
      versionId = await getLatestVersionId(NST_PRIMARY.owner, NST_PRIMARY.name, token);
    } catch (e) {
      console.log("Primary NST failed, trying fallback...");
      modelUsed = NST_FALLBACK;
      versionId = await getLatestVersionId(NST_FALLBACK.owner, NST_FALLBACK.name, token);
    }

    const version = `${modelUsed.owner}/${modelUsed.name}:${versionId}`;
    const input = { content, style };

    const created = await createPredictionByVersion({ version, input, token });
    const done = await pollPrediction(created, token, { maxWaitMs: 3 * 60 * 1000 });

    const outputUrl = firstOutputUrl(done.output);

    return sendJson(res, 200, {
      mode: "nst",
      output: outputUrl, // ✅ إرجاع الرابط الصافي للواجهة الأمامية
      outputUrl: outputUrl,
      rawOutput: done.output
    });

  } catch (err) {
    console.error("Handler Error:", err);
    const status = err.httpStatus && Number.isInteger(err.httpStatus) ? err.httpStatus : 500;
    return sendJson(res, status, {
      error: err.message || "Server error",
      replicateStatus: err.httpStatus || null,
    });
  }
};
