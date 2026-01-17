import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";

// 1. جلب مفتاح Gemini من إعدادات Vercel
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// 2. إعدادات التصميم (الهيدر)
const Header = () => (
  <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 py-4">
    <div className="container mx-auto px-4 flex justify-center">
      <img src="https://e.top4top.io/p_366949c1c1.png" alt="Logo" style={{height: '70px', objectFit: 'contain'}} />
    </div>
  </header>
);

export default function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [aiData, setAiData] = useState<{title: string, colors: string[]} | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- دوال المساعدة ---

  // تحويل الملف لصيغة يفهمها Gemini
  const fileToGenerativePart = async (file: File) => {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
  };

  // دالة "الرسم" (تطبق الألوان التي اختارها Gemini)
  const applyVanGoghEffect = (imageUrl: string, colors: string[]) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;

      // 1. رسم الأساس
      ctx.drawImage(img, 0, 0);

      // 2. تطبيق تأثيرات زيتية (فلتر)
      ctx.filter = 'contrast(1.4) saturate(1.6) sepia(0.4)';
      ctx.drawImage(img, 0, 0);
      ctx.filter = 'none';

      // 3. تطبيق "لمسة Gemini" (الألوان المقترحة)
      if (colors && colors.length >= 2) {
        // اللون الأول (الأساس)
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = colors[0];
        ctx.globalAlpha = 0.3;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // اللون الثاني (الظلال)
        ctx.globalCompositeOperation = 'color-burn';
        ctx.fillStyle = colors[1];
        ctx.globalAlpha = 0.2;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 4. إنهاء وحفظ
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      setResultImage(canvas.toDataURL('image/jpeg', 0.9));
      setIsProcessing(false);
    };
  };

  // --- الدالة الرئيسية (الاتصال بـ Gemini) ---
  const handleProcessImage = async (file: File) => {
    if (!API_KEY) {
      setErrorMsg("مفتاح API مفقود! تأكد من إضافته في Vercel باسم VITE_GEMINI_API_KEY");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setResultImage(null);
    setAiData(null);

    try {
      const base64Data = await fileToGenerativePart(file);

      // إعداد Gemini
      const genAI = new GoogleGenAI({ apiKey: API_KEY });
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // الأمر (Prompt) الموجه للذكاء الاصطناعي
      const prompt = `
        You are an AI art director inspired by Van Gogh. 
        Analyze this image and extract a creative color palette (2 hex codes) that transforms this specific photo into a "Starry Night" style painting.
        Also, give it a short, creative title in Arabic.
        Output ONLY valid JSON like this: {"colors": ["#Hex1", "#Hex2"], "title": "Arabic Title"}
      `;

      // الإرسال
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: file.type, data: base64Data } },
            { text: prompt }
          ]
        }]
      });

      const responseText = result.response.text();
      
      // استخراج الـ JSON من الرد
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("فشل في قراءة رد الذكاء الاصطناعي");

      const data = JSON.parse(jsonMatch[0]);
      setAiData(data);

      // البدء في الرسم بناءً على توجيهات Gemini
      const imageUrl = URL.createObjectURL(file);
      applyVanGoghEffect(imageUrl, data.colors);

    } catch (error) {
      console.error(error);
      setErrorMsg("حدث خطأ أثناء الاتصال بـ Gemini، جاري تطبيق النمط الافتراضي...");
      // في حال الفشل، نطبق ألوان افتراضية
      const imageUrl = URL.createObjectURL(file);
      applyVanGoghEffect(imageUrl, ['#fbc02d', '#1a237e']);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedImage(url);
      handleProcessImage(file);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-[Cairo] bg-[#fdfaf1] text-right" dir="rtl">
      <Header />
      
      <main className="flex-1 p-5 max-w-4xl mx-auto w-full">
        <h1 className="text-4xl font-black text-[#1a237e] text-center mb-4">ماذا لو رسمك فان جوخ؟</h1>
        <p className="text-center text-slate-600 mb-10 text-lg">تحليل ذكي ورسم فوري بدعم من Google Gemini</p>

        {!selectedImage ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-4 border-dashed border-[#fbc02d] rounded-3xl p-10 text-center cursor-pointer bg-white hover:-translate-y-1 transition-transform shadow-sm"
          >
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-2xl font-bold text-[#1a237e]">اضغط لرفع صورتك</h3>
            <p className="text-slate-500 mt-2">دع Gemini يبدع في تلوينها</p>
            <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" className="hidden" />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-wrap gap-8 justify-center">
              {/* الأصل */}
              <div className="flex-1 min-w-[300px] max-w-[400px]">
                <h3 className="text-center font-bold text-slate-500 mb-2">الأصل</h3>
                <img src={selectedImage} alt="Original" className="w-full rounded-2xl shadow-md" />
              </div>

              {/* النتيجة */}
              <div className="flex-1 min-w-[300px] max-w-[400px]">
                <h3 className="text-center font-bold text-[#1a237e] mb-2">
                  {isProcessing ? 'جاري التحليل...' : (aiData?.title || 'لوحة فان جوخ')}
                </h3>
                
                {isProcessing ? (
                  <div className="h-[300px] flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-[#fbc02d]">
                    <div className="text-4xl animate-spin mb-4">✨</div>
                    <p className="font-bold text-[#1a237e]">Gemini يختار الألوان...</p>
                  </div>
                ) : resultImage ? (
                  <div className="relative rounded-2xl overflow-hidden border-8 border-double border-[#1a237e] shadow-xl">
                    <img src={resultImage} alt="AI Result" className="w-full block" />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="text-center pt-4">
              {errorMsg && <p className="text-red-500 text-sm mb-4">{errorMsg}</p>}

              {resultImage && (
                <div className="flex flex-col items-center gap-6">
                  {aiData && (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                      <p className="text-slate-600 mb-2">الألوان المختارة لك:</p>
                      <div className="flex justify-center gap-2">
                        {aiData.colors.map(c => (
                          <div key={c} style={{background: c}} className="w-8 h-8 rounded-full border border-gray-300 shadow-inner" title={c}></div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button onClick={() => {setSelectedImage(null); setResultImage(null);}} className="text-[#1a237e] border-2 border-[#1a237e] px-6 py-3 rounded-full font-bold hover:bg-slate-50">
                      صورة جديدة
                    </button>
                    <a href={resultImage} download="gemini-art.jpg" className="bg-[#fbc02d] text-[#1a237e] px-8 py-3 rounded-full font-bold shadow-md hover:bg-[#f9a825]">
                      حفظ اللوحة ⬇
                    </a>
                  </div>

                  <div className="mt-8 p-6 bg-white rounded-3xl border-t-4 border-[#1a237e] shadow-lg w-full max-w-lg">
                    <h2 className="text-2xl font-bold text-[#1a237e] mb-2">أعجبتك النتيجة؟ 😍</h2>
                    <p className="text-slate-600 mb-6">هذا سحر الذكاء الاصطناعي.. لكن سحر يدك لا يعلى عليه!</p>
                    <a href="https://salla.sa/elhamk23" target="_blank" className="inline-block bg-[#1a237e] text-white px-8 py-3 rounded-full font-bold hover:shadow-xl transition-shadow">
                      تسوق أدوات الرسم 🛍️
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
