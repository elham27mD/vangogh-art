const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const transformToVanGogh = async (base64Image: string): Promise<string> => {
  if (!API_KEY) {
    throw new Error("مفتاح API غير موجود! تأكد من ملف .env");
  }

  // تنظيف النص من البادئة إذا كانت موجودة لضمان قبول السيرفر للبيانات
  const cleanBase64 = base64Image.includes(',') 
    ? base64Image.split(',')[1] 
    : base64Image;

  // استخدام fetch بدلاً من SDK للتحكم الكامل في الرد
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: 'image/png',
                data: cleanBase64
              }
            },
            {
              text: "Re-render this photo exactly in the iconic oil painting style of Vincent van Gogh. Use thick, visible impasto brushstrokes, swirling patterns, and a starry night color palette. Output ONLY the image.",
            }
          ]
        }],
        generationConfig: {
          temperature: 0.4,
          candidateCount: 1
        }
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "فشل الاتصال بخدمة Gemini.");
  }

  // --- كود الاستخراج الذكي للصورة ---
  if (data.candidates && data.candidates.length > 0) {
    const parts = data.candidates[0].content.parts;
    
    for (const part of parts) {
      // فحص الصيغتين المحتملتين (لأن جوجل تغير التسمية أحياناً)
      const imgData = part.inlineData || part.inline_data;

      if (imgData && imgData.data) {
        const mimeType = imgData.mimeType || imgData.mime_type || "image/png";
        // إرجاع رابط الصورة جاهزاً للعرض في وسم <img>
        return `data:${mimeType};base64,${imgData.data}`;
      }
    }
  }

  throw new Error("الموديل استجاب لكن لم يتم العثور على صورة في الرد.");
};
