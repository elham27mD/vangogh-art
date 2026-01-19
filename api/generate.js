// api/generate.js - هذا الكود مخصص لستايل "ليلة النجوم"

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

    // موديل متخصص في دمج الستايل (Neural Style Transfer)
    const modelId = "nightmareai/style-transfer:c7d017645d3198017411595261313353770c07524443517ac112436405046006";

    // 🔥🔥🔥 هنا السر: رابط مباشر للوحة "The Starry Night" 🔥🔥🔥
    // الموديل سيستخدم هذه الصورة كمرجع للأسلوب الفني
    const vanGoghStyleImage = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg";

    const predictionResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Prefer": "wait=50"
      },
      body: JSON.stringify({
        version: modelId,
        input: {
          // صورتك الأصلية
          content: image, 
          
          // صورة الستايل (ليلة النجوم)
          style: vanGoghStyleImage,
          
          // content_strength: الحفاظ على ملامح الصورة الأصلية (0.85 ممتاز)
          // إذا أردت الستايل يطغى أكثر، قلل هذا الرقم إلى 0.7
          content_strength: 0.85, 
          
          // style_strength: قوة تطبيق ستايل فان جوخ (1.0 كاملة)
          style_strength: 1.0,
        }
      }),
    });

    if (!predictionResponse.ok) {
      const err = await predictionResponse.json();
      throw new Error(err.detail || "Prediction failed");
    }

    let prediction = await predictionResponse.json();

    // انتظار النتيجة
    while (prediction.status === "starting" || prediction.status === "processing") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const pollResponse = await fetch(prediction.urls.get, {
        headers: {"Authorization": `Bearer ${token}`}
      });
      if (!pollResponse.ok) throw new Error("Polling failed");
      prediction = await pollResponse.json();
    }

    if (prediction.status === "succeeded") {
       res.status(200).json({ output: prediction.output });
    } else {
       res.status(500).json({ error: prediction.error });
    }

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message });
  }
}
