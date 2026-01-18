// src/services/geminiService.ts

const API_KEY = import.meta.env.VITE_DEEPAI_API_KEY;

export const transformToVanGogh = async (base64Image: string): Promise<string> => {
  if (!API_KEY) {
    throw new Error("مفتاح DeepAI مفقود! تأكد من وجود VITE_DEEPAI_API_KEY في ملف .env وإعادة تشغيل السيرفر.");
  }

  try {
    // 1. تحويل Base64 إلى Blob بطريقة آمنة
    const responseBlob = await fetch(base64Image);
    const blob = await responseBlob.blob();

    // 2. تجهيز البيانات
    const formData = new FormData();
    formData.append('content', blob);
    formData.append('style', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1200px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg');

    console.log("جاري الاتصال بـ DeepAI...");

    // 3. الإرسال
    const response = await fetch('https://api.deepai.org/api/neural-style', {
      method: 'POST',
      headers: {
        'api-key': API_KEY,
      },
      body: formData
    });

    const data = await response.json();

    // فحص الأخطاء وعرض السبب الحقيقي
    if (!response.ok) {
      console.error("DeepAI Error Details:", data); // 👈 انظر هنا في الكونسول
      throw new Error(data.err || data.error || `خطأ من السيرفر: ${response.status}`);
    }

    if (data.output_url) {
      return data.output_url;
    }

    throw new Error("لم يرجع السيرفر رابطاً للصورة.");

  } catch (error: any) {
    console.error("Fetch Error:", error);
    // تمرير رسالة الخطأ الأصلية للواجهة
    throw new Error(error.message || "فشل الاتصال بخدمة DeepAI");
  }
};
