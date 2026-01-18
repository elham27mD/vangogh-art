import Replicate from "replicate";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const replicate = new Replicate({
    auth: process.env.VITE_REPLICATE_API_TOKEN,
  });

  try {
    const { image } = req.body;

    // موديل SDXL الرسمي (النسخة المستقرة 1.0)
    // هذا هو المعرف الصحيح الذي لن يعطيك خطأ 422 بإذن الله
    const modelVersion = "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929fb43c";

    const output = await replicate.run(
      `stability-ai/sdxl:${modelVersion}`,
      {
        input: {
          image: image,
          
          // البرومبت: وصف ستايل فان جوخ بدقة
          prompt: "oil painting style of Vincent Van Gogh, The Starry Night style, thick impasto brushstrokes, expressive swirling patterns, vibrant blue and yellow colors, artistic masterpiece, highly detailed texture",
          
          // الأشياء التي نريد تجنبها (مهم جداً لعدم تشويه الصورة)
          negative_prompt: "text, watermark, signature, ugly, distorted, low quality, blurry, photography, realistic, deformed, bad anatomy, writing",
          
          // قوة تأثير الستايل (0.0 إلى 1.0)
          // 0.75: يعطي توازن ممتاز (يغير الستايل بالكامل لكن يحافظ على شكل الشخص/الغرض)
          prompt_strength: 0.75, 
          
          // عدد الخطوات (30 كافية جداً وتعطي جودة ممتازة وسريعة)
          num_inference_steps: 30
        }
      }
    );

    res.status(200).json({ output: output[0] });

  } catch (error) {
    console.error("Replicate Error:", error);
    res.status(500).json({ error: error.message });
  }
}
