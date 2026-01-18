import Replicate from "replicate";

export default async function handler(req, res) {
  // 1. السماح فقط بطلبات POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const replicate = new Replicate({
    auth: process.env.VITE_REPLICATE_API_TOKEN,
  });

  try {
    const { image } = req.body;

    console.log("🚀 Starting SDXL Generation...");

    // استخدام موديل SDXL (الأقوى والأكثر استقراراً)
    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b7159d722d8b1dd",
      {
        input: {
          image: image, // الصورة (Base64)
          
          // البرومبت: وصف دقيق للستايل
          prompt: "oil painting style of Vincent Van Gogh, thick impasto brushstrokes, swirling patterns, starry night colors, artistic masterpiece, highly detailed",
          
          // ما الذي لا نريده (Negative Prompt)
          negative_prompt: "text, watermark, writing, blurry, ugly, distorted, low quality, photography, realistic, bad anatomy",
          
          // قوة التغيير (0.0 إلى 1.0)
          // 0.65 = يحافظ على شكل الشخص والملابس بنسبة جيدة ويغير الستايل
          prompt_strength: 0.65, 
          
          // عدد الخطوات (الجودة)
          num_inference_steps: 30
        }
      }
    );

    console.log("✅ Success:", output);
    // SDXL يعيد مصفوفة، نأخذ الرابط الأول
    res.status(200).json({ output: output[0] });

  } catch (error) {
    console.error("❌ Replicate Error:", error);
    res.status(500).json({ error: error.message || "حدث خطأ في السيرفر" });
  }
}
