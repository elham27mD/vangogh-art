const STYLE_URL = "https://www.elhamk23.art/style/Starry_Night.jpg";

// Helper sleep for polling
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type GenerateOk = {
  ok: true;
  status: string;
  predictionId?: string;
  pollUrl?: string;
  outputUrl?: string;
  output?: any;
  error?: string | null;
};

type GenerateErr = {
  ok: false;
  error: string;
  replicateStatus?: number | null;
  replicatePayload?: any;
};

type GenerateResponse = GenerateOk | GenerateErr;

export const transformToVanGogh = async (base64Image: string): Promise<string> => {
  // 1) Create prediction
  const createResp = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // عندك الفرونت يرسل image، والباك يدعم image / imageBase64
      image: base64Image,

      // أهم إضافة: رابط الستايل المستضاف عندك
      styleUrl: STYLE_URL,

      // استخدم NST (يحافظ على الشكل)
      mode: "nst",
    }),
  });

  // Read as text first to avoid JSON.parse crash if HTML shows up
  const rawCreate = await createResp.text();
  let createData: GenerateResponse;

  try {
    createData = rawCreate ? (JSON.parse(rawCreate) as GenerateResponse) : ({} as any);
  } catch {
    console.error("Non-JSON response from /api/generate (POST):", rawCreate.slice(0, 800));
    throw new Error("رد السيرفر ليس JSON (تحقق من Vercel Logs و Network).");
  }

  if (!createResp.ok && createResp.status !== 202) {
    console.error("Generate POST error:", createData);
    const msg = (createData as GenerateErr)?.error || "فشلت المعالجة في السيرفر.";
    throw new Error(msg);
  }

  // 2) If finished immediately (200)
  if (createResp.status === 200) {
    const url =
      (createData as GenerateOk).outputUrl ||
      (typeof (createData as GenerateOk).output === "string" ? (createData as GenerateOk).output : null) ||
      (Array.isArray((createData as GenerateOk).output) ? (createData as GenerateOk).output?.[0] : null);

    if (!url || typeof url !== "string") {
      console.error("Unexpected 200 response shape:", createData);
      throw new Error("النتيجة رجعت بدون رابط صالح للصورة.");
    }

    return url;
  }

  // 3) If still processing (202) -> poll GET /api/generate?id=...
  const predictionId = (createData as GenerateOk).predictionId;
  const pollUrl = (createData as GenerateOk).pollUrl;

  if (!predictionId || !pollUrl) {
    console.error("Missing predictionId/pollUrl in 202 response:", createData);
    throw new Error("السيرفر رجع 202 بدون معلومات polling.");
  }

  // Poll with backoff up to ~6 minutes
  const maxWaitMs = 6 * 60 * 1000;
  const started = Date.now();
  let delay = 900;

  while (true) {
    if (Date.now() - started > maxWaitMs) {
      throw new Error("انتهت مهلة الانتظار. حاول مرة أخرى.");
    }

    await sleep(delay);
    delay = Math.min(Math.floor(delay * 1.35), 3500);

    const statusResp = await fetch(pollUrl, { method: "GET" });
    const rawStatus = await statusResp.text();

    let statusData: GenerateResponse;
    try {
      statusData = rawStatus ? (JSON.parse(rawStatus) as GenerateResponse) : ({} as any);
    } catch {
      console.error("Non-JSON response from /api/generate (GET):", rawStatus.slice(0, 800));
      throw new Error("رد السيرفر ليس JSON أثناء polling (تحقق من Vercel Logs).");
    }

    if (!statusResp.ok) {
      console.error("Polling GET error:", statusData);
      const msg = (statusData as GenerateErr)?.error || "فشل polling.";
      throw new Error(msg);
    }

    const okData = statusData as GenerateOk;

    if (okData.status === "succeeded") {
      const url =
        okData.outputUrl ||
        (typeof okData.output === "string" ? okData.output : null) ||
        (Array.isArray(okData.output) ? okData.output?.[0] : null);

      if (!url || typeof url !== "string") {
        console.error("Succeeded but no usable outputUrl:", statusData);
        throw new Error("نجحت المعالجة لكن لم يرجع رابط صورة صالح.");
      }

      return url;
    }

    if (okData.status === "failed" || okData.status === "canceled") {
      console.error("Prediction failed:", statusData);
      throw new Error("فشلت المعالجة داخل Replicate.");
    }

    // else: still processing
  }
};
