// services/geminiService.ts

export const transformToVanGogh = async (base64Image: string): Promise<string> => {
  
  // لا تقم بأي تعديل أو قص للنص (مثل split)
  // Replicate يحتاج المقدمة (data:image...) ليعرف نوع الملف
  
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: base64Image // نرسل النص كما خرج من الضاغط
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Server API Error:", data); 
      throw new Error(data.error || "فشل الاتصال بخدمة المعالجة");
    }

    // إرجاع رابط الصورة الجاهز من Replicate
    return data.output;
    
  } catch (error: any) {
    console.error("Service Error:", error);
    throw new Error(error.message || "حدث خطأ غير متوقع أثناء الاتصال");
  }
};
