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

    // اسم موديل ControlNet الشهير والمستقر
    const modelOwner = "jagilley";
    const modelName = "controlnet-canny";

    console.log(`Fetching latest version for ${modelOwner}/${modelName}...`);

    // 1. جلب أحدث إصدار تلقائياً
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

    // 2. إرسال الطلب (لاحظ اختلاف المدخلات قليلاً لهذا الموديل)
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
          
          // البرومبت: نطلب الستايل بقوة
          prompt: "oil painting of a person in the style of Vincent Van Gogh, The Starry Night, thick impasto brushstrokes, swirling blue and yellow patterns, expressive art",
          
          // الممنوعات
          negative_prompt: "photorealistic, realism, photography, ugly, deformed, blurry, low quality",
          
          // إعدادات ControlNet المهمة:
          // num_samples: عدد النسخ (1 كافية)
          // image_resolution: دقة الصورة (512 ممتاز للسرعة والجودة لهذا الموديل)
          // ddim_steps: خطوات المعالجة (20 كافية)
          // scale: مدى التزام الموديل بالنص (9.0 جيد)
          num_samples: "1",
          image_resolution: "512",
          ddim_steps: 20,
          scale: 9.0,
          
          // low_threshold & high_threshold: حساسية التقاط الخطوط (100-200 قياسي)
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
       // ControlNet يعيد قائمة صور، نأخذ الأخيرة (النتيجة النهائية)
       // أحياناً يعيد الصورة الأولى هي "خريطة الخطوط" والثانية هي "النتيجة"
       // الكود أدناه يأخذ آخر صورة في المصفوفة لضمان أنها النتيجة الملونة
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
