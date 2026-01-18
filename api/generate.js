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

    console.log("🚀 Starting Generation with Official SDXL...");

    // ⚠️ تصحيح الخطأ: هذا هو المعرف الرسمي الأخير والنشط لـ SDXL
    // ID: 7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929fb43c
    const output = await replicate.run(
      "stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929fb43c",
      {
        input: {
          image: image, // الصورة القادمة من المستخدم
          
          // البرومبت: وصف ستايل فان جوخ
          prompt: "oil painting style of Vincent Van Gogh, The Starry Night style, thick impasto brushstrokes, expressive swirling patterns, vibrant blue and yellow colors, artistic masterpiece, highly detailed texture",
          
          // الحفاظ على الجودة ومنع التشوه
          negative_prompt: "text, watermark, signature, ugly, distorted, low quality, blurry, photography, realistic, deformed, bad anatomy, writing",
          
          // ⚠️ هام: قوة التأثير
          // 0.65 = رقم متوازن جداً، يحافظ على ملامح الصورة الأصلية ويطبق الستايل
          prompt_strength: 0.65, 
          
          num_inference_steps: 25 // 25 خطوة كافية جداً وسريعة
        }
      }
    );

    console.log("✅ Success:", output);
    res.status(200).json({ output: output[0] });

  } catch (error) {
    console.error("❌ Replicate Error:", error);
    // إرجاع رسالة الخطأ واضحة
    res.status(500).json({ error: error.message || "حدث خطأ في الاتصال بـ Replicate" });
  }
}
