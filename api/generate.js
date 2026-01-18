import Replicate from "replicate";

export default async function handler(req, res) {
  // 1. التحقق من طريقة الطلب
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 2. التحقق من المفتاح في السيرفر
  const replicate = new Replicate({
    auth: process.env.VITE_REPLICATE_API_TOKEN,
  });

  try {
    const { image } = req.body;

    // 3. استدعاء الموديل (timbrooks/instruct-pix2pix)
    // هذا الموديل ممتاز لتحويل الصور بناءً على التعليمات
    const output = await replicate.run(
      "timbrooks/instruct-pix2pix:30c1d0b916a6f8efce20493f5d61ee27491ab2a60437c13c588468b9810ec23f",
      {
        input: {
          image: image,
          prompt: "turn this into a van gogh oil painting, thick brushstrokes, starry night style, vibrant colors",
          num_inference_steps: 20,
          image_guidance_scale: 1.5,
        }
      }
    );

    // Replicate يعيد رابط الصورة
    res.status(200).json({ output: output[0] });

  } catch (error) {
    console.error("Replicate Error:", error);
    res.status(500).json({ error: error.message });
  }
}
