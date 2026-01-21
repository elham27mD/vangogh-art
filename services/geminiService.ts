// services/geminiService.ts

type ApiOk = {
  mode?: string;
  predictionId?: string;
  status?: string;
  outputUrl?: string;
  output?: any;
  error?: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function transformToVanGogh(base64Image: string): Promise<string> {
  const resp = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: base64Image, // keep your current frontend behavior
      // optional overrides if you want:
      // strength: 0.8,
      // guidance_scale: 12,
      // num_inference_steps: 35,
    }),
  });

  const raw = await resp.text();

  let data: ApiOk;
  try {
    data = raw ? (JSON.parse(raw) as ApiOk) : {};
  } catch {
    console.error("Non-JSON from /api/generate:", raw.slice(0, 800));
    throw new Error("رد السيرفر ليس JSON. تحقق من Vercel Logs.");
  }

  if (!resp.ok) {
    throw new Error(data?.error || "فشلت المعالجة.");
  }

  const url =
    data.outputUrl ||
    (typeof data.output === "string" ? data.output : null) ||
    (Array.isArray(data.output) ? data.output[0] : null);

  if (!url) {
    console.error("No outputUrl in response:", data);
    throw new Error("لم يتم الحصول على رابط الصورة المعدلة.");
  }

  return url;
}
