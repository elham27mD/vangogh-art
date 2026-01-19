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

    console.log("🚀 Starting Generation: Identity Preserved SDXL...");

    // نستخدم الموديل الرسمي (Stability AI) لضمان عدم توقفه (404/422)
    const response = await fetch(
      "https://api.replicate.com/v1/models/stability-ai/sdxl/predictions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Prefer": "wait=60"
        },
        body: JSON.stringify({
          input: {
            image: image,

            // 🔥 البرومبت المصحح (Smart Identity Preservation):
            // 1. حذفنا أي إشارة لأي عرق محدد (Middle Eastern, etc).
            // 2. استبدلناها بـ "the subject in the input image" (الشخص في الصورة المدخلة).
            // 3. أمرنا الموديل بـ "maintain exact facial features and ethnicity" (الحفاظ على الملامح والعرقية).
            prompt: "A masterpiece oil painting in the style of Vincent Van Gogh, The Starry Night. Portrait of the subject in the input image. Thick impasto brushstrokes, swirling blue and yellow patterns in the background. Maintain the exact facial features, skin tone, and ethnicity of the original person. High quality, artistic.",

            // ⛔ الممنوعات (Safety Net):
            // نمنع تغيير العرق (change ethnicity) أو التبييض (whitewashed) أو تغيير الملامح
            negative_prompt: "change ethnicity, change race, whitewashed, different face, distorted features, perfume, bottle, product, object, caucasian, blurry, low quality, ugly, deformed",

            // ⚖️ الميزان:
            // 0.60: رقم ممتاز يوازن بين قوة الستايل وبين الحفاظ على هوية الشخص
            prompt_strength: 0.60,

            // الإعدادات القياسية
            guidance_scale: 7.5,
            num_inference_steps: 35,
            refine: "expert_ensemble_refiner",
            high_noise_frac: 0.8
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Replicate API Error:", errorText);
      throw new Error("Failed to connect to Replicate API");
    }

    let prediction = await response.json();

    // انتظار النتيجة (Polling)
    while (prediction.status === "starting" || prediction.status === "processing") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const pollResponse = await fetch(prediction.urls.get, {
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
