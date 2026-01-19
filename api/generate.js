/**
 * /api/generate.js
 * Final Version: Checks for REPLICATE_API_TOKEN and uses NST default.
 */

const REPLICATE_API_BASE = "https://api.replicate.com/v1";
const DEFAULT_STARRY_NIGHT_STYLE_URL = "https://upload.wikimedia.org/wikipedia/commons/d/de/Vincent_van_Gogh_Starry_Night.jpg";
const NST_PRIMARY = { owner: "huage001", name: "adaattn" };
const NST_FALLBACK = { owner: "nkolkin13", name: "neuralneighborstyletransfer" };
const SDXL_OFFICIAL = "stability-ai/sdxl";

let cachedLatestVersion = { key: "", versionId: "", fetchedAt: 0 };

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function normalizeToDataUrl(imageBase64, mimeType = "image/jpeg") {
  if (!imageBase64 || typeof imageBase64 !== "string") return null;
  if (imageBase64.startsWith("data:")) return imageBase64;
  return `data:${mimeType};base64,${imageBase64}`;
}

async function replicateFetch(path, { token, method = "GET", body, timeoutMs = 30000, preferWaitSeconds } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    if (preferWaitSeconds != null) headers.Prefer = `wait=${preferWaitSeconds}`;
    const resp = await fetch(`${REPLICATE_API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: controller.signal });
    const text = await resp.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!resp.ok) {
      const msg = (data && data.detail) || (data && data.error) || (typeof data === "string" ? data : "Replicate API error");
      const err = new Error(msg); err.httpStatus = resp.status; err.payload = data; throw err;
    }
    return data;
  } finally { clearTimeout(t); }
}

async function getLatestVersionId(owner, name, token) {
  const key = `${owner}/${name}`;
  if (cachedLatestVersion.key === key && cachedLatestVersion.versionId && Date.now() - cachedLatestVersion.fetchedAt < 6 * 3600 * 1000) return cachedLatestVersion.versionId;
  const model = await replicateFetch(`/models/${owner}/${name}`, { token });
  const versionId = model?.latest_version?.id;
  if (!versionId) throw new Error(`No version for ${key}`);
  cachedLatestVersion = { key, versionId, fetchedAt: Date.now() };
  return versionId;
}

async function createPredictionByVersion({ version, input, token }) {
  return replicateFetch(`/predictions`, { token, method: "POST", preferWaitSeconds: 60, body: { version, input } });
}

async function createPredictionByOfficialModel({ model, input, token }) {
  return replicateFetch(`/models/${model}/predictions`, { token, method: "POST", preferWaitSeconds: 60, body: { input } });
}

async function pollPrediction(prediction, token, { maxWaitMs = 180000 } = {}) {
  const started = Date.now();
  let current = prediction;
  while (true) {
    if (current.status === "succeeded") return current;
    if (current.status === "failed" || current.status === "canceled") throw new Error(current.error || "Failed");
    if (Date.now() - started > maxWaitMs) throw new Error("Timeout");
    await sleep(1000);
    current = await replicateFetch(`/predictions/${current.id}`, { token });
  }
}

function firstOutputUrl(output) {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) return firstOutputUrl(output[0]);
  if (typeof output === "object" && output) return firstOutputUrl(output.url || output.image || output.output);
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.end();

  // 👇 طباعة للتأكد من أن الكود الجديد يعمل
  console.log("🚀 Request received in NEW handler");

  const token = process.env.REPLICATE_API_TOKEN; 
  if (!token) return sendJson(res, 500, { error: "Missing REPLICATE_API_TOKEN" });

  let body;
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : req.body; } catch { return sendJson(res, 400, { error: "Invalid JSON" }); }

  const { imageBase64, imageUrl, mode = "nst" } = body || {};
  const content = imageUrl || normalizeToDataUrl(imageBase64);
  if (!content) return sendJson(res, 400, { error: "No image provided" });

  const style = DEFAULT_STARRY_NIGHT_STYLE_URL;

  try {
    if (mode === "sdxl") {
      // SDXL Logic
      const created = await createPredictionByOfficialModel({
        model: SDXL_OFFICIAL,
        input: { image: content, prompt: "Vincent Van Gogh Style", prompt_strength: 0.22 },
        token
      });
      const done = await pollPrediction(created, token);
      return sendJson(res, 200, { output: firstOutputUrl(done.output) });
    }

    // NST Logic (Default)
    let versionId = await getLatestVersionId(NST_PRIMARY.owner, NST_PRIMARY.name, token);
    const created = await createPredictionByVersion({ version: `${NST_PRIMARY.owner}/${NST_PRIMARY.name}:${versionId}`, input: { content, style }, token });
    const done = await pollPrediction(created, token);
    return sendJson(res, 200, { output: firstOutputUrl(done.output) });

  } catch (err) {
    console.error("Handler Error:", err);
    return sendJson(res, 500, { error: err.message });
  }
};
