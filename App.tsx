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
  
  // لعرض رد السيرفر الخام (Debugging)
  const [serverLog, setServerLog] = useState<string>(""); 

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleNanoBananaGen = async (file: File) => {
    if (!API_KEY) {
      setErrorMsg("مفتاح API مفقود!");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setResultImage(null);
    setServerLog("");

    try {
      const base64Data = await fileToBase64(file);

      // --- استخدام الموديل المحدد: gemini-2.5-flash-image ---
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                // 1. الصورة الأصلية (Base64)
                { inline_data: { mime_type: file.type, data: base64Data } },
                // 2. البرومبت الثابت (كما طلبت)
                { text: "make this image into Van Gogh style painting" }
              ]
            }],
            // إعدادات التوليد
            generationConfig: {
              temperature: 0.4,
              candidateCount: 1 
            }
          })
        }
      );

      const data = await response.json();
      
      // تخزين الرد الخام
      setServerLog(JSON.stringify(data, null, 2));

      if (!response.ok) {
        // إذا كان الموديل غير متاح بعد للعامة، سيظهر الخطأ هنا
        throw new Error(data.error?.message || `Error ${response.status}: فشل الاتصال بالموديل`);
      }

      // --- استخراج الصورة المولدة ---
      let foundImage = false;
      if (data.candidates && data.candidates.length > 0) {
        const parts = data.candidates[0].content.parts;
        for (const part of parts) {
          // في Gemini Image Model، الصورة تأتي كـ inline_data
          if (part.inline_data && part.inline_data.data) {
             setResultImage(`data:${part.inline_data.mime_type};base64,${part.inline_data.data}`);
             foundImage = true;
             break;
          }
        }
      }

      if (!foundImage) {
        setErrorMsg("الموديل استجاب لكنه لم يرسل صورة. (قد يكون الرد نصياً فقط، راجع السجل بالأسفل).");
      }

    } catch (err: any) {
      console.error(err);
      setErrorMsg(`خطأ: ${err.message}`);
      setServerLog(prev => prev + "\nEXCEPTION: " + JSON.stringify(err, null, 2));
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
      setServerLog("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-[Cairo] bg-[#fdfaf1] text-right" dir="rtl">
      <Header />
      
      <main className="flex-1 p-5 max-w-4xl mx-auto w-full">
        <h1 className="text-4xl font-black text-[#1a237e] text-center mb-4">Nano Banana 🍌</h1>
        <p className="text-center text-slate-600 mb-10 text-lg">تجربة موديل Gemini 2.5 Flash Image</p>

        {!selectedImage ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-4 border-dashed border-[#fbc02d] rounded-3xl p-10 text-center cursor-pointer bg-white hover:-translate-y-1 transition-transform shadow-sm"
          >
            <div className="text-6xl mb-4">🖼️</div>
            <h3 className="text-2xl font-bold text-[#1a237e]">اضغط لرفع صورتك</h3>
            <p className="text-slate-500 mt-2">Server-Side Image Gen</p>
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
                <h3 className="text-center font-bold text-[#1a237e] mb-2">النتيجة (Gemini 2.5)</h3>
                
                {isProcessing ? (
                  <div className="h-[300px] flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-[#fbc02d]">
                    <div className="text-4xl animate-spin mb-4">🍌</div>
                    <p className="font-bold text-[#1a237e]">جاري الرسم السحابي...</p>
                  </div>
                ) : resultImage ? (
                  <div className="relative rounded-2xl overflow-hidden border-8 border-double border-[#1a237e] shadow-xl">
                    <img src={resultImage} alt="AI Result" className="w-full block" />
                  </div>
                ) : (
                  <div className="h-[300px] flex flex-col items-center justify-center bg-slate-100 rounded-2xl border-2 border-dashed border-gray-300 p-4 text-center">
                    <p className="text-gray-500 font-bold mb-2">بانتظار الصورة...</p>
                    {errorMsg && <p className="text-sm text-red-500">راجع السجل بالأسفل 👇</p>}
                  </div>
                )}
              </div>
            </div>

            <div className="text-center pt-4">
              {!isProcessing && !resultImage && (
                <button 
                  onClick={() => imageFile && handleNanoBananaGen(imageFile)}
                  className="bg-[#1a237e] text-white px-10 py-4 rounded-full text-xl font-bold shadow-lg hover:bg-[#151b60] transition-colors"
                >
                  🚀 إرسال (Gemini 2.5 Flash Image)
                </button>
              )}
              
              {resultImage && (
                <div className="flex justify-center gap-4">
                 <button onClick={() => {setSelectedImage(null); setResultImage(null);}} className="text-[#1a237e] border-2 border-[#1a237e] px-6 py-3 rounded-full font-bold hover:bg-slate-50">
                   تجربة جديدة
                 </button>
                 <a href={resultImage} download="gemini-2.5-art.png" className="bg-[#fbc02d] text-[#1a237e] px-8 py-3 rounded-full font-bold shadow-md hover:bg-[#f9a825]">
                   حفظ الصورة ⬇
                 </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- منطقة السجل (لفحص الرد) --- */}
        {(serverLog || errorMsg) && (
          <div className="mt-12 text-left bg-gray-900 rounded-xl overflow-hidden border border-gray-700 shadow-2xl" dir="ltr">
            <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center">
              <span className="text-gray-300 font-mono text-sm">Server Response Log</span>
              <span className="text-xs text-gray-500">Model: gemini-2.5-flash-image</span>
            </div>
            <div className="p-4 font-mono text-xs overflow-x-auto max-h-[400px] overflow-y-auto">
              {errorMsg && <div className="text-red-400 mb-4 font-bold">STATUS: {errorMsg}</div>}
              <pre className="text-green-400 whitespace-pre-wrap">{serverLog || "Waiting..."}</pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
