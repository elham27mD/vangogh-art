export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.VITE_REPLICATE_API_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "API Token is missing" });
  }

  try {
    const { image } = req.body;

    // 1. جلب أحدث إصدار
    const modelResponse = await fetch("https://api.replicate.com/v1/models/stability-ai/sdxl", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      }
    });

    if (!modelResponse.ok) throw new Error(`Failed to fetch model info`);
    const modelData = await modelResponse.json();
    const latestVersionId = modelData.latest_version.id;

    // 2. إنشاء الصورة
    const predictionResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Prefer": "wait=50"
      },
      body: JSON.stringify({
        version: latestVersionId,
        input: {
          image: image,
          
          // البرومبت: تأكيد على أن الستايل يجب أن يغطي كل شيء
          prompt: "An expressive oil painting rendered ENTIRELY in the style of Vincent Van Gogh's 'The Starry Night'. The subject is painted with thick, swirling impasto brushstrokes in dominant deep blues and vibrant yellows. The entire canvas, including the person, is transformed into this artistic style. No photorealism remaining.",
          
          // الممنوعات
          negative_prompt: "photorealistic, realism, photography, smooth, flat, blurry, low quality, ugly, deformed, perfume, bottle",
          
          // 🔥🔥🔥 التعديلات الجريئة 🔥🔥🔥
          
          // 1. قوة التغيير عالية (المجازفة)
          prompt_strength: 0.75,
          
          // 2. التوجيه النصي عالي جداً (إجبار على الستايل)
          guidance_scale: 15.0, 
          
          // عدد خطوات أعلى لضمان جودة التفاصيل الفنية
          num_inference_steps: 40
        }
      }),
    });

    if (!predictionResponse.ok) {
      const err = await predictionResponse.json();
      throw new Error(err.detail || "Prediction failed");
    }

    let prediction = await predictionResponse.json();

    // 3. انتظار النتيجة
    while (prediction.status === "starting" || prediction.status === "processing") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const pollResponse = await fetch(prediction.urls.get, {
        headers: {"Authorization": `Bearer ${token}`}
      });
      if (!pollResponse.ok) throw new Error("Polling failed");
      prediction = await pollResponse.json();
    }

    if (prediction.status === "succeeded") {
       res.status(200).json({ output: prediction.output[0] });
    } else {
       res.status(500).json({ error: prediction.error });
    }

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message });
  }
}
