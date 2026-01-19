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

    // ---------------------------------------------------------
    // الخطوة 1: جلب رقم أحدث إصدار تلقائياً (عشان ما نغلط في الرقم)
    //
    // ---------------------------------------------------------
    console.log("Fetching latest SDXL version...");
    const modelResponse = await fetch("https://api.replicate.com/v1/models/stability-ai/sdxl", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      }
    });

    if (!modelResponse.ok) {
      throw new Error(`Failed to fetch model info: ${modelResponse.status}`);
    }

    const modelData = await modelResponse.json();
    // نأخذ الـ ID من أحدث نسخة موجودة في السيرفر حالاً
    // (response object contains latest_version)
    const latestVersionId = modelData.latest_version.id;
    console.log("Latest Version ID:", latestVersionId);

    // ---------------------------------------------------------
    // الخطوة 2: إنشاء الصورة باستخدام الإصدار الذي جلبناه
    //
    // ---------------------------------------------------------
    const predictionResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Prefer": "wait=60" //
      },
      body: JSON.stringify({
        version: latestVersionId, //
        input: {
          image: image,
          prompt: "oil painting style of Vincent Van Gogh, The Starry Night style, thick impasto brushstrokes, expressive swirling patterns, vibrant blue and yellow colors, artistic masterpiece, highly detailed texture",
          negative_prompt: "text, watermark, signature, ugly, distorted, low quality, blurry, photography, realistic, deformed, bad anatomy, writing",
          prompt_strength: 0.65,
          num_inference_steps: 25
        }
      }),
    });

    if (!predictionResponse.ok) {
      const err = await predictionResponse.json();
      throw new Error(err.detail || "Prediction failed to start");
    }

    let prediction = await predictionResponse.json();

    // ---------------------------------------------------------
    // الخطوة 3: انتظار النتيجة (Polling)
    //
    // ---------------------------------------------------------
    while (prediction.status === "starting" || prediction.status === "processing") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const pollResponse = await fetch(prediction.urls.get, { // (urls.get)
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!pollResponse.ok) {
         throw new Error("Polling failed");
      }

      prediction = await pollResponse.json();
    }

    if (prediction.status === "succeeded") {
       res.status(200).json({ output: prediction.output[0] });
    } else {
       console.error("Failed:", prediction.error);
       res.status(500).json({ error: prediction.error || "Generation failed" });
    }

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message });
  }
}
