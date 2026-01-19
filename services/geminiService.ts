export const transformToVanGogh = async (base64Image: string): Promise<string> => {
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: base64Image,      // ما زلنا ندعم الحقل القديم
        // أو لو تستخدم الجديد:
        // imageBase64: base64Image,
        // mode: "nst",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Server API Error:", data);
      throw new Error(data.error || "فشل الاتصال بالموديل");
    }

    // أهم سطر: استخرج الرابط من أي شكل يرجع من السيرفر
    const url =
      data.outputUrl ||
      (typeof data.output === "string" ? data.output : null) ||
      (Array.isArray(data.output) ? data.output[0] : null);

    if (!url || typeof url !== "string") {
      console.error("Unexpected API response:", data);
      throw new Error("النتيجة رجعت بدون رابط صالح للصورة.");
    }

    return url;
  } catch (error: any) {
    console.error("Service Error:", error);
    throw new Error(error.message || "حدث خطأ غير متوقع");
  }
};