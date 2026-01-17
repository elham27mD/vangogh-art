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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string>(""); 

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleProcessImage = async (file: File) => {
    if (!API_KEY) {
      setErrorMsg("مفتاح API مفقود! تأكد من إعدادات Vercel.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setResultImage(null);
    setDebugLog("");

    try {
      const base64Data = await fileToBase64(file);

      // --- التغيير هنا: استخدام gemini-1.5-flash بدلاً من 2.0 ---
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                { inline_data: { mime_type: file.type, data: base64Data } },
                { text: "Analyze this image and generate a new version of it in Van Gogh Style. If you cannot generate images directly, please describe exactly how it would look." }
              ]
            }]
          })
        }
      );

      const data = await response.json();
      setDebugLog(JSON.stringify(data, null, 2));

      if (!response.ok) {
        throw new Error(data.error?.message || "فشل الاتصال بـ Google API");
      }

      // محاولة استخراج الصورة (لو وجدت)
      let foundImage = false;
      if (data.candidates && data.candidates[0]?.content?.parts) {
        const parts = data.candidates[0].content.parts;
        for (const part of parts) {
          if (part.inline_data && part.inline_data.data) {
             setResultImage(`data:${part.inline_data.mime_type};base64,${part.inline_data.data}`);
             foundImage = true;
             break;
          }
        }
      }

      // إذا لم نجد صورة، فهذا يعني أن الموديل أرجع نصاً فقط
      if (!foundImage) {
        setErrorMsg("Gemini 1.5 Flash (API) يعمل بنجاح، لكنه أرجع نصاً وصفياً (انظر للسجل الأسود). حالياً Gemini API المجاني لا يدعم توليد ملفات الصور المباشرة (Image Generation) بل يدعم فهم الصور (Vision).");
      }

    } catch (err: any) {
      console.error(err);
      setErrorMsg(`خطأ تقني: ${err.message}`);
      setDebugLog(prev => prev + "\n\nEXCEPTION:\n" + JSON.stringify(err, null, 2));
    } finally {
      setIsProcessing(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setSelectedImage(URL.createObjectURL(file));
      setResultImage(null);
      setErrorMsg(null);
      setDebugLog("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-[Cairo] bg-[#fdfaf1] text-right" dir="rtl">
      <Header />
      
      <main className="flex-1 p-5 max-w-4xl mx-auto w-full">
        <h1 className="text-4xl font-black text-[#1a237e] text-center mb-4">اختبار Gemini 1.5 Flash</h1>
        <p className="text-center text-slate-600 mb-10 text-lg">النسخة المستقرة والسريعة</p>

        {!selectedImage ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-4 border-dashed border-[#fbc02d] rounded-3xl p-10 text-center cursor-pointer bg-white hover:-translate-y-1 transition-transform shadow-sm"
          >
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-2xl font-bold text-[#1a237e]">ارفع صورتك</h3>
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
                <h3 className="text-center font-bold text-[#1a237e] mb-2">النتيجة</h3>
                
                {isProcessing ? (
                  <div className="h-[300px] flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-[#fbc02d]">
                    <div className="text-4xl animate-spin mb-4">⏳</div>
                    <p className="font-bold text-[#1a237e]">جاري الاتصال...</p>
                  </div>
                ) : resultImage ? (
                  <div className="relative rounded-2xl overflow-hidden border-8 border-double border-[#1a237e] shadow-xl">
                    <img src={resultImage} alt="AI Result" className="w-full block" />
                  </div>
                ) : (
                  <div className="h-[300px] flex flex-col items-center justify-center bg-slate-100 rounded-2xl border-2 border-dashed border-gray-300 p-4 text-center">
                    <p className="text-gray-500 font-bold mb-2">لا توجد صورة</p>
                    {errorMsg && <p className="text-sm text-red-500">انظر للتفاصيل بالأسفل 👇</p>}
                  </div>
                )}
              </div>
            </div>

            <div className="text-center pt-4">
              {!isProcessing && !resultImage && (
                <button 
                  onClick={() => imageFile && handleProcessImage(imageFile)}
                  className="bg-[#1a237e] text-white px-10 py-4 rounded-full text-xl font-bold shadow-lg hover:bg-[#151b60] transition-colors"
                >
                  🚀 إرسال (Gemini 1.5)
                </button>
              )}
              
              {resultImage && (
                 <button onClick={() => {setSelectedImage(null); setResultImage(null);}} className="text-[#1a237e] border-2 border-[#1a237e] px-6 py-3 rounded-full font-bold hover:bg-slate-50">
                   تجربة جديدة
                 </button>
              )}
            </div>
          </div>
        )}

        {/* --- منطقة المبرمج (السجل الأسود) --- */}
        {(debugLog || errorMsg) && (
          <div className="mt-12 text-left bg-gray-900 rounded-xl overflow-hidden border border-gray-700 shadow-2xl" dir="ltr">
            <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center">
              <span className="text-gray-300 font-mono text-sm">System Log</span>
            </div>
            <div className="p-4 font-mono text-xs overflow-x-auto max-h-[400px] overflow-y-auto">
              {errorMsg && <div className="text-red-400 mb-4 font-bold">NOTE: {errorMsg}</div>}
              <pre className="text-green-400 whitespace-pre-wrap">{debugLog || "Waiting..."}</pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
