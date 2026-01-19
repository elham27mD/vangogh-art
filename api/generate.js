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

    console.log("Using Official SDXL Model with Low Strength...");

    // 1. استخدام الرابط الرسمي للموديل (Official Model Endpoint)
    // هذا الرابط لا يحتاج إلى version ID ولا يتغير أبداً
    const response = await fetch(
      "https://api.replicate.com/v1/models/stability-ai/sdxl/predictions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Prefer": "wait=60" //
        },
        body: JSON.stringify({
          input: {
            image: image,
            
            // ✅ البرومبت المصحح: حذفنا كلمة portrait لكي لا يخترع وجوهاً
            // نركز فقط على "تطبيق الستايل" على "الصورة الموجودة"
            prompt: "Style transfer of The Starry Night by Vincent Van Gogh. Oil painting texture, thick impasto brushstrokes, swirling blue and yellow patterns. Keep the original object shape and structure exactly as is, just change the texture.",
            
            // ✅ الممنوعات: نمنع تغيير الهيكل أو إضافة عناصر
            negative_prompt: "alter shape, change content, face, portrait, perfume, extra items, text, watermark, blurry, deformed, low quality, realism, photo",
            
            // ✅✅ السر هنا: خفضنا القوة إلى 0.5
            // 0.5 = 50% من الصورة الأصلية + 50% ستايل (يحافظ على الثوب كما هو ويغير ألوانه فقط)
            // إذا كان التغيير ضعيفاً، ارفعه لـ 0.55، لكن لا تتجاوز 0.6 مع الأشياء الجامدة
            prompt_strength: 0.50,
            
            num_inference_steps: 30
          }
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || errorData.error || "Failed to create prediction");
    }

    let prediction = await response.json();

    // 2. انتظار النتيجة (Polling)
    while (prediction.status === "starting" || prediction.status === "processing") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const pollResponse = await fetch(prediction.urls.get, { //
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
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
