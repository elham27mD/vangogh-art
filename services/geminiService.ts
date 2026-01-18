// src/services/geminiService.ts

export const transformToVanGogh = async (base64Image: string): Promise<string> => {
  
  // ⚠️ التعديل المهم: نرسل base64Image كما هو (مع المقدمة data:image...)
  // لا تقم بعمل split أو تنظيف هنا، لأن Replicate يحتاج الصيغة الكاملة
  
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: base64Image // نرسل الكود كاملاً
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "فشل الاتصال بالسيرفر");
    }

    return data.output;
    
  } catch (error: any) {
    console.error("Service Error:", error);
    throw new Error(error.message || "حدث خطأ غير متوقع");
  }
};
