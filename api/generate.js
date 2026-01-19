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

    // اسم الموديل المتخصص في نقل الستايل
    const modelOwner = "nightmareai";
    const modelName = "style-transfer";

    // -------------------------------------------------------------------------
    // الخطوة 1: جلب رقم أحدث إصدار تلقائياً (الحل الجذري لمشكلة 422)
    //
    // -------------------------------------------------------------------------
    console.log(`Fetching latest version for ${modelOwner}/${modelName}...`);
    const modelResponse = await fetch(`https://api.replicate.com/v1/models/${modelOwner}/${modelName}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      }
    });

    if (!modelResponse.ok) {
       throw new Error(`Failed to find model: ${modelResponse.status}`);
    }

    const modelData = await modelResponse.json();
    // نأخذ الـ ID الصحيح والشغال حالياً من استجابة السيرفر
    const latestVersionId = modelData.latest_version.id;
    console.log("Using Version ID:", latestVersionId);

    // -------------------------------------------------------------------------
    // الخطوة 2: إرسال الصورة مع ستايل "The Starry Night"
    //
    // -------------------------------------------------------------------------
    
    // رابط لوحة ليلة النجوم الأصلية
    const starryNightUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg";

    const predictionResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Prefer": "wait=50" //
      },
      body: JSON.stringify({
        version: latestVersionId, // نستخدم الرقم الذي جلبناه تواً
        input: {
          content: image,          // صورتك
          style: starryNightUrl,   // لوحة فان جوخ
          content_strength: 0.85,  // الحفاظ على ملامح الصورة الأصلية
          style_strength: 1.0,     // قوة الستايل
        }
      }),
    });

    if (!predictionResponse.ok) {
      const err = await predictionResponse.json();
      throw new Error(err.detail || "Prediction failed to start");
    }

    let prediction = await predictionResponse.json();

    // -------------------------------------------------------------------------
    // الخطوة 3: انتظار اكتمال المعالجة
    //
    // -------------------------------------------------------------------------
    while (prediction.status === "starting" || prediction.status === "processing") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const pollResponse = await fetch(prediction.urls.get, { 
        headers: { "Authorization": `Bearer ${token}` }
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
