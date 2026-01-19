export const transformToVanGogh = async (base64Image: string): Promise<string> => {
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // ✅ backend الجديد يستقبل imageBase64
        imageBase64: base64Image,
        // إذا base64Image أصلاً data URL، ما تحتاج mimeType
        // mimeType: "image/jpeg",
        mode: "nst", // خليها الافتراضي (يحافظ على الشكل)
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Server API Error:", data);
      throw new Error(data.error || "فشل الاتصال بالموديل");
    }

    // ✅ استخدم outputUrl أولاً (هو اللي نضمنه)
    const url = data.outputUrl || data.output;

    if (!url || typeof url !== "string") {
      console.error("Unexpected output shape:", data);
      throw new Error("النتيجة رجعت بدون رابط صالح للصورة.");
    }

    return url;
  } catch (error: any) {
    console.error("Service Error:", error);
    throw new Error(error.message || "حدث خطأ غير متوقع");
  }
};
