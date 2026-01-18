// api/generate.js
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

    // استخدام موديل Instruct-Pix2Pix
    const output = await replicate.run(
      "timbrooks/instruct-pix2pix:30c1d0b916a6f8efce20493f5d61ee27491ab2a60437c13c588468b9810ec23f",
      {
        input: {
          image: image,
          // البرومبت: نأمره بتحويل الستايل فقط
          prompt: "make it into a vincent van gogh oil painting, thick brushstrokes, artistic style",
          
          // ⚠️ أهم نقطة: هذا الرقم يحدد مدى التزام الموديل بالصورة الأصلية
          // 1.5 = التزام متوازن
          // 2.0 = التزام قوي بالصورة الأصلية (جرب رفعه إذا شطح الموديل)
          image_guidance_scale: 1.8, 
          
          // عدد الخطوات (20-50). كلما زاد، زادت الجودة والوقت
          num_inference_steps: 30,
        }
      }
    );

    res.status(200).json({ output: output[0] });

  } catch (error) {
    console.error("Replicate Error:", error);
    res.status(500).json({ error: error.message });
  }
}
