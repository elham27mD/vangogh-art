import React, { useState, useRef } from 'react';

// جلب المفتاح
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

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
  const [aiTitle, setAiTitle] = useState<string>(""); 
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // دالة مساعدة لتحويل الملف
  const fileToBase64 = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // الرسام الذكي: ينفذ تعليمات Gemini
  const applyAiDirectives = (imageUrl: string, directives: any) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;

      // 1. رسم الصورة الأصلية
      ctx.drawImage(img, 0, 0);

      // 2. تطبيق الفلاتر التي اختارها Gemini
      const contrast = directives.contrast || 1.2;
      const saturate = directives.saturate || 1.5;
      const hue = directives.hue_rotate || 0;
      const sepia = directives.sepia || 0.2;

      ctx.filter = `contrast(${contrast}) saturate(${saturate}) hue-rotate(${hue}deg) sepia(${sepia})`;
      ctx.drawImage(img, 0, 0);
      ctx.filter = 'none';

      // 3. تطبيق طبقة الألوان الفنية
      if (directives.dominant_colors && directives.dominant_colors.length > 0) {
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = directives.dominant_colors[0];
        ctx.globalAlpha = 0.35;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (directives.dominant_colors[1]) {
           ctx.globalCompositeOperation = 'color-burn';
           ctx.fillStyle = directives.dominant_colors[1];
           ctx.globalAlpha = 0.2;
           ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      
      // إضافة نسيج الكانفاس (Texture)
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = '#fdfaf1'; // لون ورق خفيف
      ctx.globalAlpha = 0.1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      setResultImage(canvas.toDataURL('image/jpeg', 0.9));
      setIsProcessing(false);
    };
  };

  const handleProcessImage = async (file: File) => {
    if (!API_KEY) {
      setErrorMsg("عذراً، الخدمة غير متاحة حالياً (Missing API Key).");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setResultImage(null);
    setAiTitle("");

    try {
      const base64Data = await fileToBase64(file);

      // نطلب من Gemini تحليل الصورة وإعطاء "وصفة فنية"
      const prompt = `
        Act as an AI art director. Analyze this image.
        I want to transform it into a Van Gogh Starry Night style painting.
        Determine the best CSS filter values (contrast, saturate, hue_rotate, sepia) and 2 dominant hex colors to overlay.
        Also give it a creative Arabic title.
        Return ONLY a JSON object:
        {
          "contrast": number (1.0-2.0),
          "saturate": number (1.0-2.5),
          "hue_rotate": number (-30 to 30),
          "sepia": number (0.0-0.8),
          "dominant_colors": ["#hex1", "#hex2"],
          "title_ar": "Arabic Title Here"
        }
      `;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                { inline_data: { mime_type: file.type, data: base64Data } },
                { text: prompt }
              ]
            }]
          })
        }
      );

      const data = await response.json();

      if (!data.candidates || !data.candidates[0].content) {
        throw new Error("لم يتمكن الذكاء الاصطناعي من تحليل الصورة.");
      }

      const textResponse = data.candidates[0].content.parts[0].text;
      
      // استخراج JSON من النص
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const directives = JSON.parse(jsonMatch[0]);
        setAiTitle(directives.title_ar || "لوحة من وحي الخيال");
        
        // تطبيق التعليمات فوراً
        const imageUrl = URL.createObjectURL(file);
        applyAiDirectives(imageUrl, directives);
      } else {
        throw new Error("فشل في معالجة رد الذكاء الاصطناعي");
      }

    } catch (err: any) {
      console.error(err);
      // في حال حدوث أي خطأ، نطبق فلتراً افتراضياً جميلاً لضمان رضا العميل
      const imageUrl = URL.createObjectURL(file);
      applyAiDirectives(imageUrl, {
          contrast: 1.3, 
          saturate: 1.6, 
          hue_rotate: -10, 
          sepia: 0.3,
          dominant_colors: ['#1a237e', '#fbc02d']
      });
      setAiTitle("ليلة مرصعة بالنجوم");
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedImage(url);
      handleProcessImage(file); // البدء التلقائي
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-[Cairo] bg-[#fdfaf1] text-right" dir="rtl">
      <Header />
      
      <main className="flex-1 p-5 max-w-4xl mx-auto w-full">
        <h1 className="text-4xl font-black text-[#1a237e] text-center mb-4">ماذا لو رسمك فان جوخ؟</h1>
        <p className="text-center text-slate-600 mb-10 text-lg">حوّل صورك إلى لوحات زيتية خالدة بلمسة ذكاء اصطناعي.</p>

        {!selectedImage ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-4 border-dashed border-[#fbc02d] rounded-3xl p-12 text-center cursor-pointer bg-white hover:-translate-y-1 transition-transform shadow-sm group"
          >
            <div className="text-7xl mb-4 transform group-hover:scale-110 transition-transform">🎨</div>
            <h3 className="text-2xl font-bold text-[#1a237e]">اضغط لرفع صورتك</h3>
            <p className="text-slate-500 mt-2">دع Gemini يبدع في تلوينها</p>
            <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" className="hidden" />
          </div>
        ) : (
          <div className="space-y-10">
            <div className="flex flex-wrap gap-8 justify-center items-start">
              {/* الصورة الأصلية */}
              <div className="flex-1 min-w-[300px] max-w-[400px]">
                <h3 className="text-center font-bold text-slate-500 mb-3">الأصل</h3>
                <img src={selectedImage} alt="Original" className="w-full rounded-2xl shadow-md" />
              </div>

              {/* النتيجة */}
              <div className="flex-1 min-w-[300px] max-w-[400px]">
                <h3 className="text-center font-bold text-[#1a237e] mb-3">
                   {isProcessing ? 'جاري التحليل...' : (aiTitle || 'لوحة فان جوخ')}
                </h3>
                
                {isProcessing ? (
                  <div className="aspect-square flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-[#fbc02d]">
                    <div className="text-5xl animate-spin mb-4">✨</div>
                    <p className="font-bold text-[#1a237e]">Gemini يختار الألوان...</p>
                    <p className="text-xs text-slate-400 mt-2">جاري مزج الزيت...</p>
                  </div>
                ) : resultImage ? (
                  <div className="relative rounded-2xl overflow-hidden border-[10px] border-double border-[#1a237e] shadow-2xl">
                    <img src={resultImage} alt="AI Result" className="w-full block" />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="text-center pt-6">
              {errorMsg && <p className="text-red-500 mb-4 font-bold">{errorMsg}</p>}
              
              {resultImage && !isProcessing && (
                <div className="flex flex-col items-center gap-6">
                  <div className="flex gap-4 flex-wrap justify-center">
                    <button onClick={() => {setSelectedImage(null); setResultImage(null);}} className="text-[#1a237e] border-2 border-[#1a237e] px-8 py-3 rounded-full font-bold hover:bg-slate-50 transition-colors">
                      صورة جديدة ↻
                    </button>
                    <a href={resultImage} download="vangogh-art.jpg" className="bg-[#fbc02d] text-[#1a237e] px-10 py-3 rounded-full font-bold shadow-md hover:bg-[#f9a825] transition-colors flex items-center gap-2">
                      <span>حفظ التحفة</span> ⬇
                    </a>
                  </div>

                  <div className="mt-8 p-8 bg-white rounded-[2rem] border-t-8 border-[#1a237e] shadow-xl max-w-2xl w-full transform hover:-translate-y-1 transition-transform">
                    <h2 className="text-2xl font-black text-[#1a237e] mb-2">أعجبتك النتيجة؟ 😍</h2>
                    <p className="text-slate-600 mb-6">
                      الذكاء الاصطناعي مجرد بداية.. إبداعك الحقيقي يحتاج أدوات حقيقية.
                    </p>
                    <a href="https://salla.sa/elhamk23" target="_blank" rel="noopener noreferrer" className="inline-block bg-[#1a237e] text-white px-10 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-2xl transition-all">
                      تسوّق أدوات الرسم 🛍️
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="bg-slate-50 py-8 mt-auto text-center border-t border-slate-200">
        <p className="text-slate-500 font-bold">تم التطوير بواسطة <span className="text-[#1a237e]">إلهام العطار</span></p>
        <p className="text-slate-400 text-sm mt-1">جميع الحقوق محفوظة © 2026</p>
      </footer>
    </div>
  );
}
