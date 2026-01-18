// services/geminiService.ts

// هذه الدالة الآن تتصل بالسيرفر الخاص بك (api/generate.js)
// ولا تتصل بشركة الذكاء الاصطناعي مباشرة
export const transformToVanGogh = async (base64Image: string): Promise<string> => {
  
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: base64Image // نرسل الصورة للسيرفر
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "فشل الاتصال بالسيرفر");
    }

    // إرجاع رابط الصورة الناتج من Replicate
    return data.output;
    
  } catch (error: any) {
    console.error("Service Error:", error);
    throw new Error(error.message || "حدث خطأ غير متوقع");
  }
};
