// src/services/geminiService.ts
// ملاحظة: قمنا بتغيير الاسم الداخلي لكن حافظنا على اسم الدالة لكي لا يتأثر باقي الكود

const API_KEY = import.meta.env.VITE_DEEPAI_API_KEY;

export const transformToVanGogh = async (base64Image: string): Promise<string> => {
  if (!API_KEY) {
    throw new Error("مفتاح DeepAI مفقود! تأكد من ملف .env");
  }

  // DeepAI يحتاج الصورة كملف أو رابط، لا يدعم Base64 مباشرة في بعض الأحيان
  // لكننا سنستخدم خدعة FormData لإرسالها كملف
  
  // 1. تحويل Base64 إلى Blob
  const base64Response = await fetch(base64Image);
  const blob = await base64Response.blob();

  // 2. تجهيز البيانات
  const formData = new FormData();
  formData.append('content', blob); // الصورة التي رفعها المستخدم
  formData.append('style', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1200px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg'); // رابط لوحة فان جوخ (Starry Night) لتقليد الستايل

  // 3. الإرسال إلى DeepAI Neural Style API
  const response = await fetch('https://api.deepai.org/api/neural-style', {
    method: 'POST',
    headers: {
      'api-key': API_KEY, // المفتاح هنا
      // لا تضع Content-Type يدوياً عند استخدام FormData، المتصفح سيضعه بنفسه
    },
    body: formData
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.err || "فشل الاتصال بخدمة DeepAI");
  }

  // DeepAI يعيد رابط للصورة (output_url)
  // نحتاج لتحويل الرابط إلى Base64 لعرضه فوراً أو إعادته كما هو
  // الكود الحالي في ResultView يتوقع رابطاً، لذا سنعيد الرابط مباشرة
  
  if (data.output_url) {
    // يفضل تمرير الرابط عبر بروكسي أو تحميله وتحويله إذا واجهت مشاكل CORS
    // لكن للتجربة السريعة، أعد الرابط كما هو:
    return data.output_url;
    
    /* ملاحظة: إذا واجهت مشكلة في عرض الصورة بسبب CORS،
       يمكنك تفعيل هذا الكود الإضافي لتحويل الرابط إلى Base64:
       
       const imgResp = await fetch(data.output_url);
       const imgBlob = await imgResp.blob();
       return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(imgBlob);
       });
    */
  }

  throw new Error("لم يتم استلام صورة من DeepAI");
};
