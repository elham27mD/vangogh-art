// services/geminiService.ts

type Ok200 = {
  ok: true;
  status: string;
  outputUrl?: string | null;
  output?: any;
};

type Ok202 = {
  ok: true;
  status: string;
  predictionId: string;
  pollUrl: string;
};

type Err = {
  ok: false;
  error: string;
  replicateStatus?: number | null;
  replicatePayload?: any;
};

type ApiResponse = Ok200 | Ok202 | Err;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function extractUrl(data: any): string | null {
  if (!data) return null;
  if (typeof data.outputUrl === "string" && data.outputUrl.startsWith("http")) return data.outputUrl;

  const out = data.output;
  if (typeof out === "string") return out;
  if (Array.isArray(out) && typeof out[0] === "string") return out[0];

  return null;
}

export const transformToVanGogh = async (base64Image: string): Promise<string> => {
  // Create prediction
  const resp = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: base64Image, // data URL from your uploader/compressor

      // optional overrides:
      // prompt: "...",
      // negative_prompt: "...",
      // strength: 0.8,
      // guidance_scale: 12,
      // num_inference_steps: 35,
    }),
  });

  // Read as text first to avoid JSON.parse crash if Vercel returns HTML error page
  const raw = await resp.text();
  let data: ApiResponse;

  try {
    data = raw ? (JSON.parse(raw) as ApiResponse) : ({ ok: false, error: "Empty response" } as Err);
  } catch {
    console.error("Non-JSON response from /api/generate:", raw.slice(0, 800));
    throw new Error("رد السيرفر ليس JSON. تحقق من Vercel Logs.");
  }

  // If server returned error
  if (!resp.ok && resp.status !== 202) {
    const msg = (data as Err)?.error || "فشلت المعالجة في السيرفر.";
    throw new Error(msg);
  }

  // 200: done immediately
  if (resp.status === 200) {
    const url = extractUrl(data);
    if (!url) {
      console.error("Unexpected 200 response:", data);
      throw new Error("النتيجة رجعت بدون رابط صالح للصورة.");
    }
    return url;
  }

  // 202: poll
  const d202 = data as Ok202;
  if (!d202.pollUrl) {
    console.error("Missing pollUrl in 202 response:", data);
    throw new Error("السيرفر رجع 202 بدون pollUrl.");
  }

  const maxWaitMs = 6 * 60 * 1000; // 6 minutes
  const started = Date.now();
  let delay = 900;

  while (true) {
    if (Date.now() - started > maxWaitMs) {
      throw new Error("انتهت مهلة الانتظار. حاول مرة أخرى.");
    }

    await sleep(delay);
    delay = Math.min(Math.floor(delay * 1.35), 3500);

    const pollResp = await fetch(d202.pollUrl, { method: "GET" });
    const pollRaw = await pollResp.text();

    let pollData: ApiResponse;
    try {
      pollData = pollRaw ? (JSON.parse(pollRaw) as ApiResponse) : ({ ok: false, error: "Empty poll response" } as Err);
    } catch {
      console.error("Non-JSON polling response:", pollRaw.slice(0, 800));
      throw new Error("رد السيرفر ليس JSON أثناء polling. تحقق من Vercel Logs.");
    }

    if (!pollResp.ok) {
      const msg = (pollData as Err)?.error || "فشل polling.";
      throw new Error(msg);
    }

    const status = (pollData as any).status;
    if (status === "succeeded") {
      const url = extractUrl(pollData);
      if (!url) {
        console.error("Succeeded but no url:", pollData);
        throw new Error("نجحت المعالجة لكن لم يرجع رابط صورة صالح.");
      }
      return url;
    }

    if (status === "failed" || status === "canceled") {
      throw new Error("فشلت المعالجة داخل Replicate.");
    }
  }
};
