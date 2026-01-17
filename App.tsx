import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const Header = () => (
  <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 py-4">
    <div className="container mx-auto px-4 flex justify-center">
      <img src="https://e.top4top.io/p_366949c1c1.png" alt="Logo" style={{height: '60px', objectFit: 'contain'}} />
    </div>
  </header>
);

export default function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string>(""); // لعرض رد الذكاء الاصطناعي الخام
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToGenerativePart = async (file: File) => {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
  };

  const handleProcessImage = async (file: File) => {
    if (!API_KEY) {
      setErrorMsg("Error: VITE_GEMINI_API_KEY is missing in Vercel!");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setResultImage(null);
    setDebugLog("");

    try {
      const base64Data = await fileToGenerativePart(file);
      const genAI = new GoogleGenAI({ apiKey: API_KEY });
      // استخدام الموديل الأحدث
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: file.type, data: base64Data } },
            // طلب صريح جداً بإرجاع صورة
            { text: "Transform this image into a Van Gogh Starry Night oil painting. Return the image file strictly." }
          ]
        }]
      });

      const response = result.response;
      console.log("Raw Gemini Response:", response);
      
      // سنحاول البحث عن أي صورة في الرد
      // ملاحظة: Gemini 2.0 قد يرجع الصورة كـ inlineData في الـ candidates
      let foundImage = false;

      if (response.candidates && response.candidates.length > 0) {
        const parts = response.candidates[0].content.parts;
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
             // وجدنا صورة!
             setResultImage(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
             foundImage = true;
             break;
          }
        }
        
        // إذا لم نجد صورة، نعرض النص الذي قاله الذكاء الاصطناعي (قد يكون رسالة رفض أو وصف)
        if (!foundImage) {
           const textResponse = response.text();
           setDebugLog(`Gemini رد بنص وليس صورة: "${textResponse}"`);
           setErrorMsg("الذكاء الاصطناعي لم يرجع ملف صورة، بل أرسل نصاً (انظر للتفاصيل بالأسفل).");
        }
      }

    } catch (err: any) {
      console.error("API Error:", err);
      setErrorMsg(`خطأ تقني: ${err.message || "Unknown Error"}`);
      setDebugLog(JSON.stringify(err, null, 2));
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
        <h1 className="text-4xl font-black text-[#1a237e] text-center mb-4">اختبار Gemini 2.0 الحقيقي</h1>
        <p className="text-center text-slate-600 mb-10 text-lg">بدون فلاتر، بدون مجاملات.</p>

        {!selectedImage ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-4 border-dashed border-[#fbc02d] rounded-3xl p-12 text-center cursor-pointer bg-white hover:-translate-y-1 transition-transform shadow-sm"
          >
            <div className="text-7xl mb-4">🧪</div>
            <h3 className="text-2xl font-bold text-[#1a237e]">ارفع الصورة للاختبار</h3>
            <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" className="hidden" />
          </div>
        ) : (
          <div className="space-y-10">
            <div className="flex flex-wrap gap-8 justify-center items-start">
              {/* الأصل */}
              <div className="flex-1 min-w-[300px] max-w-[400px]">
                <h3 className="text-center font-bold text-slate-500 mb-3">الصورة الأصلية</h3>
                <img src={selectedImage} alt="Original" className="w-full rounded-2xl shadow-md" />
              </div>

              {/* النتيجة */}
              <div className="flex-1 min-w-[300px] max-w-[400px]">
                <h3 className="text-center font-bold text-[#1a237e] mb-3">رد Gemini 2.0</h3>
                
                {isProcessing ? (
                  <div className="aspect-square flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-[#fbc02d]">
                    <div className="text-5xl animate-spin mb-4">⏳</div>
                    <p className="font-bold text-[#1a237e]">جاري الاتصال بالسيرفر...</p>
                  </div>
                ) : resultImage ? (
                  <div className="relative rounded-2xl overflow-hidden border-[4px] border-[#1a237e] shadow-xl">
                    {/* الصورة الخام كما جاءت من API بدون أي CSS filter */}
                    <img src={resultImage} alt="API Result" className="w-full block" />
                  </div>
                ) : (
                  <div className="aspect-square flex flex-col items-center justify-center bg-slate-100 rounded-2xl border-2 border-dashed border-red-300">
                    <p className="text-red-500 font-bold">لا توجد صورة</p>
                    {errorMsg && <p className="text-xs text-red-400 mt-2 px-4 text-center">راجع سجل الأخطاء بالأسفل</p>}
                  </div>
                )}
              </div>
            </div>

            {/* منطقة عرض الأخطاء والردود الخام */}
            <div className="text-center mt-8">
              {!isProcessing && !resultImage && (
                <button 
                  onClick={() => imageFile && handleProcessImage(imageFile)}
                  className="bg-[#1a237e] text-white px-12 py-4 rounded-full text-xl font-bold shadow-lg hover:bg-[#151b60] transition-all"
                >
                  🚀 إرسال الطلب
                </button>
              )}

              {/* Debug Log Area */}
              {(errorMsg || debugLog) && (
                <div className="mt-8 p-4 bg-gray-900 text-green-400 text-left text-sm font-mono rounded-xl overflow-x-auto whitespace-pre-wrap dir-ltr" style={{direction: 'ltr'}}>
                  <p className="text-red-400 font-bold mb-2">System Log:</p>
                  {errorMsg && <div className="mb-4 text-red-300">ERROR: {errorMsg}</div>}
                  {debugLog && <div>{debugLog}</div>}
                </div>
              )}
              
              {resultImage && (
                 <button onClick={() => {setSelectedImage(null); setResultImage(null); setDebugLog(""); setErrorMsg(null);}} className="mt-6 text-[#1a237e] border-2 border-[#1a237e] px-8 py-3 rounded-full font-bold hover:bg-slate-50 transition-colors">
                    تجربة جديدة
                 </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
