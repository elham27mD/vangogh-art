export default async function handler(req, res) {
  // 1. الأمان: السماح فقط بطلبات POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // التأكد من وجود المفتاح
  if (!process.env.VITE_REPLICATE_API_TOKEN) {
    return res.status(500).json({ error: "API Token is missing" });
  }

  try {
    const { image } = req.body;

    // 2. إعداد الطلب للموديل الرسمي (Official Model)
    // نستخدم الرابط المباشر المذكور في التوثيق لتجنب مشاكل النسخ القديمة
    //
    const response = await fetch(
      "https://api.replicate.com/v1/models/stability-ai/sdxl/predictions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.VITE_REPLICATE_API_TOKEN}`, //
          "Content-Type": "application/json",
          "Prefer": "wait=60" // نطلب من السيرفر انتظار النتيجة حتى 60 ثانية
        },
        body: JSON.stringify({
          input: {
            image: image,
            // البرومبت: وصف ستايل فان جوخ
            prompt: "oil painting style of Vincent Van Gogh, The Starry Night style, thick impasto brushstrokes, expressive swirling patterns, vibrant blue and yellow colors, artistic masterpiece, highly detailed texture",
            negative_prompt: "text, watermark, signature, ugly, distorted, low quality, blurry, photography, realistic, deformed, bad anatomy, writing",
            prompt_strength: 0.65,
            num_inference_steps: 25
          }
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || errorData.error || "Failed to create prediction");
    }

    let prediction = await response.json();

    // 3. التحقق من النتيجة (Polling)
    // إذا لم تجهزة النتيجة فوراً (حالة starting أو processing)، ننتظر ونفحص مرة أخرى
    //
    while (prediction.status === "starting" || prediction.status === "processing") {
      // انتظار ثانية واحدة
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // فحص الحالة من رابط "get" الموجود في الاستجابة
      //
      const pollResponse = await fetch(prediction.urls.get, {
        headers: {
          "Authorization": `Bearer ${process.env.VITE_REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      if (!pollResponse.ok) {
         throw new Error("Failed to poll prediction status");
      }

      prediction = await pollResponse.json();
    }

    // 4. معالجة حالات الفشل أو النجاح
    if (prediction.status === "succeeded") {
       // الموديل يعيد مصفوفة، نأخذ الرابط الأول
       //
       res.status(200).json({ output: prediction.output[0] });
    } else {
       console.error("Prediction failed:", prediction.error);
       res.status(500).json({ error: prediction.error || "Prediction failed" });
    }

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message });
  }
}
