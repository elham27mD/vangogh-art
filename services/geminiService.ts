// api/generate.js - ControlNet (Canny) Solution

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

    // 1. استخدام نموذج ControlNet (Canny) المستقر
    // هذا النموذج يرسم خريطة خطوط للصورة الأصلية ويلونها بالستايل المطلوب
    // مما يضمن الحفاظ على ملامح الوجه والشكل بدقة 100%
    const modelOwner = "jagilley";
    const modelName = "controlnet-canny";

    console.log(`Fetching latest version for ${modelOwner}/${modelName}...`);

    // جلب أحدث إصدار تلقائياً لتفادي الأخطاء
    const modelResponse = await fetch(`https://api.replicate.com/v1/models/${modelOwner}/${modelName}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      }
    });

    if (!modelResponse.ok) throw new Error(`Failed to find model: ${modelResponse.status}`);
    const modelData = await modelResponse.json();
    const latestVersionId = modelData.latest_version.id;

    console.log("Using ControlNet Version:", latestVersionId);

    // 2. إرسال طلب المعالجة
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
          
          // البرومبت: نطلب ستايل "ليلة النجوم" بقوة
          // بما أن ControlNet يحمي الشكل، يمكننا أن نكون جريئين في طلب الألوان والفرشاة
          prompt: "A vibrant oil painting in the style of Vincent Van Gogh's The Starry Night. Thick, swirling impasto brushstrokes in deep blues and rich yellows. Expressive, textured, artistic masterpiece.",
          
          // الممنوعات: نمنع الواقعية والصور الفوتوغرافية
          negative_prompt: "photorealistic, realism, photography, smooth, flat, blurry, low quality, ugly, deformed",
          
          // إعدادات ControlNet:
          num_samples: "1", // صورة واحدة
          image_resolution: "512", // دقة متوازنة
          ddim_steps: 25, // خطوات كافية لجودة عالية
          scale: 9.5, // التزام قوي جداً بالبرومبت (الستايل)
          
          // حساسية التقاط الخطوط (إعدادات قياسية)
          low_threshold: 100,
          high_threshold: 200
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
       // ControlNet يعيد مصفوفة صور، الصورة الأخيرة هي النتيجة النهائية الملونة
       const outputImages = prediction.output;
       const finalImage = outputImages[outputImages.length - 1];
       
       res.status(200).json({ output: finalImage });
    } else {
       res.status(500).json({ error: prediction.error });
    }

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message });
  }
}
