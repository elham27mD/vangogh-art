import React, { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import ImageUploader from './components/ImageUploader';
import ProcessingView from './components/ProcessingView';
import ResultView from './components/ResultView';
import CTA from './components/CTA';
import Footer from './components/Footer';
import { transformToVanGogh } from './services/geminiService';
import { compressImage } from './utils/imageCompressor'; // ✅ استيراد دالة الضغط الجديدة
import { AppStage, GenerationResult } from './types';

// --- دالة فحص الحد اليومي (2 محاولات/يوم) ---
const checkDailyLimit = (): boolean => {
  const STORAGE_KEY = 'vangogh_daily_limit_v1';
  const MAX_REQUESTS = 2;
  const today = new Date().toDateString();

  const stored = localStorage.getItem(STORAGE_KEY);
  let data = stored ? JSON.parse(stored) : { date: today, count: 0 };

  // تصفير العداد إذا دخلنا في يوم جديد
  if (data.date !== today) {
    data = { date: today, count: 0 };
  }

  if (data.count >= MAX_REQUESTS) {
    return false; // تجاوز الحد
  }

  // زيادة العداد وحفظه
  data.count++;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return true;
};

const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>(AppStage.UPLOAD);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = async (file: File) => {
    // 1. التحقق من الحد اليومي قبل البدء
    if (!checkDailyLimit()) {
      setError("⛔ عذراً، لقد استهلكت رصيدك المجاني اليوم (محاولتين). تفضل بالعودة غداً!");
      return;
    }

    setError(null);
    setStage(AppStage.PROCESSING);

    try {
      // 2. ✅ ضغط الصورة قبل الإرسال (لتحسين السرعة وتقليل الحجم)
      console.log("جاري ضغط الصورة...");
      const compressedBase64 = await compressImage(file);
      console.log("تم الضغط! جاري الإرسال للسيرفر...");
      
      try {
        // 3. إرسال الصورة المضغوطة للسيرفر
        const processedImage = await transformToVanGogh(compressedBase64);
        
        setResult({
          originalUrl: compressedBase64, // نعرض الصورة المضغوطة (أسرع)
          processedUrl: processedImage
        });
        setStage(AppStage.RESULT);
      } catch (err: any) {
        console.error(err);
        setError("عذراً، حدث خطأ أثناء المعالجة: " + err.message);
        setStage(AppStage.UPLOAD);
      }

    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء تحضير الصورة (الضغط).");
      setStage(AppStage.UPLOAD);
    }
  };

  const resetApp = () => {
    setResult(null);
    setStage(AppStage.UPLOAD);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfaf1] text-slate-800 font-[Cairo]" dir="rtl">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl space-y-12">
        
        {/* حالة الرفع (الرئيسية) */}
        {stage === AppStage.UPLOAD && (
          <div className="space-y-16 animate-fade-in">
            <Hero />
            
            {/* عرض رسالة الخطأ إن وجدت */}
            {error && (
              <div className="p-4 bg-red-100 border-2 border-red-200 rounded-xl text-red-700 text-center font-bold">
                {error}
              </div>
            )}

            <ImageUploader onUpload={handleImageUpload} />
            
            <div className="pt-8">
              <CTA />
            </div>
          </div>
        )}

        {/* حالة المعالجة */}
        {stage === AppStage.PROCESSING && (
           <ProcessingView /> 
        )}

        {/* حالة النتيجة */}
        {stage === AppStage.RESULT && result && (
          <div className="animate-fade-in">
             <ResultView result={result} onReset={resetApp} />
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
};

export default App;
