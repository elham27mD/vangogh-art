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

    // نستخدم موديل العمق (Depth) لأنه الأفضل في الحفاظ على هيكل الوجه والمكان
    const modelOwner = "jagilley";
    const modelName = "controlnet-depth-sdxl";

    console.log(`Fetching latest version for ${modelOwner}/${modelName}...`);

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

    // 2. إرسال الطلب
    const predictionResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Prefer": "wait=60"
      },
      body: JSON.stringify({
        version: latestVersionId,
        input: {
          image: image,
          
          // 🔥🔥🔥 التعديل الجوهري في البرومبت لحماية العرقية 🔥🔥🔥
          // 1. حددنا بوضوح: "Middle Eastern man" (رجل شرق أوسطي).
          // 2. أضفنا: "dark hair and beard" (شعر ولحية داكنة).
          // 3. أضفنا شرطاً صارماً: "maintain exact facial features and ethnicity" (الحفاظ على الملامح والعرقية بدقة).
          // 4. وفي نفس الوقت طلبنا أن تكون الخلفية "The Starry Night sky".
          prompt: "A textured oil painting in the style of Van Gogh. Portrait of a Middle Eastern man with dark hair and beard in an office. The painting must maintain exact facial features, skin tone palette, and ethnicity of the subject. The background walls are transformed into the swirling blue and yellow sky patterns of 'The Starry Night'. Impasto brushwork everywhere.",
          
          // ✅ الممنوعات: نمنع تغيير العرقية أو الملامح
          negative_prompt: "change ethnicity, caucasian, whitewashed, different face, distorted features, plain background, photorealistic, smooth",
          
          // إعدادات الموديل:
          num_inference_steps: 35,
          
          // رفعنا التوجيه لكي يلتزم بالتعليمات الصارمة في البرومبت
          guidance_scale: 12.0, 
          
          // قوة ControlNet: 
          // 0.8 ممتازة. قوية بما يكفي لفرض هيكل الوجه العربي، وتسمح للستايل بالظهور
          strength: 0.8,
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
