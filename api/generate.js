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
          
          // ✅ التركيز على الستايل مع الحفاظ على هوية الشخص
          prompt: "An oil painting in the style of Vincent Van Gogh, The Starry Night aesthetic. Thick impasto brushstrokes, swirling sky patterns, vibrant blue and yellow palette. Highly detailed texture, artistic masterpiece. Maintain the exact identity, facial features, and hair of the subject.",
          
          // ✅✅ التصحيح هنا:
          // حذفنا (beard, mustache) لكي لا يحذف لحية المستخدم الأصلية
          // أبقينا (Van Gogh face) لمنع الموديل من رسم فان غوخ بدلاً منك
          negative_prompt: "Van Gogh face, photo, realistic, ugly, deformed, blurry, text, watermark, bad anatomy, low quality",
          
          // قوة التأثير: 0.65 ممتازة للموازنة بين الستايل والملامح
          prompt_strength: 0.65,
          num_inference_steps: 30
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
