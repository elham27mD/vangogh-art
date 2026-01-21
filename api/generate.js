/**
 * /api/generate.js
 *
 * FINAL MERGE:
 * - Engine: ControlNet Depth (Vibrant & Structural) - Fixes "Faded/Buhata" look.
 * - Infrastructure: Robust Polling & Error Handling from Code B.
 */

const REPLICATE_API_BASE = "https://api.replicate.com/v1";

// ✅ استخدام موديل ControlNet Depth (لأنه الوحيد الذي يعطي ألواناً قوية مع الحفاظ على الهيكل)
const MODEL_OWNER = "jagilley";
const MODEL_NAME = "controlnet-depth-sdxl";

// تخزين مؤقت لنسخة الموديل
let cachedLatestVersion = { key: "", versionId: "", fetchedAt: 0 };

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// دالة معالجة الصور (تقبل base64 و Data URL)
function normalizeToDataUrl(imageBase64, mimeType = "image/jpeg") {
  if (!imageBase64 || typeof imageBase64 !== "string") return null;
  if (imageBase64.startsWith("data:")) return imageBase64;
  return `data:${mimeType};base64,${imageBase64}`;
}

// دالة الاتصال القوية (Replicate Fetch Wrapper)
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
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (!resp.ok) {
      const msg = (data && data.detail) || (data && data.error) || (typeof data === "string" ? data : "Replicate API error");
      const err = new Error(msg);
      err.httpStatus = resp.status;
      err.payload = data;
      throw err;
    }
    return data;
  } finally { clearTimeout(t); }
}

// جلب أحدث إصدار تلقائياً (لمنع أخطاء 404/422)
async function getLatestVersionId(owner, name, token) {
  const key = `${owner}/${name}`;
  const now = Date.now();

  if (cachedLatestVersion.key === key && cachedLatestVersion.versionId && now - cachedLatestVersion.fetchedAt < 6 * 3600 * 1000) {
    return cachedLatestVersion.versionId;
  }

  const model = await replicateFetch(`/models/${owner}/${name}`, { token, timeoutMs: 30000 });
  const versionId = model?.latest_version?.id;
  if (!versionId) throw new Error(`Could not resolve latest_version.id for ${key}`);

  cachedLatestVersion = { key, versionId, fetchedAt: now };
  return versionId;
}

// دالة الانتظار الذكية (Polling)
async function pollPrediction(prediction, token, { maxWaitMs = 180000 } = {}) {
  const started = Date.now();
  let delay = 1000;
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
    delay = Math.min(Math.floor(delay * 1.5), 5000);
    current = await replicateFetch(`/predictions/${current.id}`, { token, timeoutMs: 30000 });
  }
}

// استخراج الرابط النهائي (لمنع الصور المكسورة)
function firstOutputUrl(output) {
  if (!output) return null;
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    // ControlNet غالباً يعيد مصفوفة، نأخذ آخر صورة لأنها النتيجة النهائية
    const lastItem = output[output.length - 1];
    return firstOutputUrl(lastItem);
  }
  if (typeof output === "object") {
    return output.url || output.image || output.output || output.result || null;
  }
  return null;
}

// --- المعالج الرئيسي (Handler) ---

module.exports = async function handler(req, res) {
  // إعدادات CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.end();

  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed. Use POST." });

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return sendJson(res, 500, { error: "Missing REPLICATE_API_TOKEN" });

  let body;
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : req.body; } 
  catch { return sendJson(res, 400, { error: "Invalid JSON" }); }

  // استقبال الصورة بمرونة (image أو imageBase64)
  const { imageBase64, image, imageUrl, mimeType = "image/jpeg" } = body || {};
  const content = imageUrl || normalizeToDataUrl(imageBase64 || image, mimeType);
  
  if (!content) return sendJson(res, 400, { error: "No image provided" });

  try {
    // 1. جلب نسخة الموديل
    const versionId = await getLatestVersionId(MODEL_OWNER, MODEL_NAME, token);
    
    // 2. إعداد المدخلات (تضبيط الألوان والحدة)
    const input = {
      image: content,
      
      // 🔥 برومبت معدل للألوان الزاهية (Vibrant & Bright)
      prompt: "A masterpiece oil painting in the style of Vincent Van Gogh, The Starry Night. Portrait of the subject in the input image. Vibrant, bright, and rich colors. High contrast. Thick impasto brushstrokes. The background is the swirling blue and yellow sky. Maintain exact facial features and identity.",
      
      // ⛔ منع الألوان الباهتة
      negative_prompt: "dull, faded, washed out, dark, low contrast, blurry, flat, cartoon, change ethnicity, deformed, ugly",
      
      // ⚙️ إعدادات القوة
      strength: 0.85,        // يحافظ على الهيكل بقوة
      guidance_scale: 15.0,  // يرفع تشبع الألوان والستايل
      num_inference_steps: 40,
      image_resolution: 512,
      condition_scale: 0.5   // يمنع الرسم المسطح
    };

    // 3. بدء التوليد
    const created = await replicateFetch(`/predictions`, {
      token,
      method: "POST",
      preferWaitSeconds: 60,
      body: { version: versionId, input },
    });

    // 4. انتظار النتيجة
    const done = await pollPrediction(created, token);

    // 5. استخراج الرابط
    const outputUrl = firstOutputUrl(done.output);

    return sendJson(res, 200, {
      status: "succeeded",
      output: outputUrl, // رابط نصي مباشر للفرونت-إند
      rawOutput: done.output
    });

  } catch (err) {
    console.error("Handler Error:", err);
    return sendJson(res, 500, { error: err.message || "Generation failed" });
  }
};
