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
        "Prefer": "wait=40"
      },
      body: JSON.stringify({
        version: latestVersionId,
        input: {
          image: image,
          
          // 🔥 تعديل 1: برومبت قوي جداً يركز على "الدوامات" و "الألوان"
          prompt: "Masterpiece oil painting by Vincent Van Gogh, The Starry Night style. Strong thick impasto brushstrokes, swirling deep blue and vibrant yellow sky patterns, expressive texture, dreamlike atmosphere. Keep the main subject visible but stylized.",
          
          // الممنوعات (نفس السابقة لحماية الشكل)
          negative_prompt: "photorealistic, realism, photography, smooth, flat, blurry, text, watermark, low quality, distorted, ugly, perfume, bottle, product",
          
          // 🔥 تعديل 2: رفعنا القوة إلى 0.65
          // هذا هو الحد الفاصل: أعلى من كذا يخرب الشكل، وأقل من كذا يضعف الستايل
          prompt_strength: 0.65,
          
          // زدنا حدة التوجيه قليلاً ليسمع كلام البرومبت أكثر من الصورة
          guidance_scale: 7.5, 
          
          num_inference_steps: 35 // زدنا الخطوات قليلاً لتحسين الجودة
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
