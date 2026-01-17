
import React, { useState, useCallback } from 'react';
import { AppStage, GenerationResult } from './types';
import Header from './components/Header';
import Hero from './components/Hero';
import ImageUploader from './components/ImageUploader';
import ProcessingView from './components/ProcessingView';
import ResultView from './components/ResultView';
import CTA from './components/CTA';
import Footer from './components/Footer';
import { transformToVanGogh } from './services/geminiService';

const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>(AppStage.UPLOAD);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = useCallback(async (file: File) => {
    setStage(AppStage.PROCESSING);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          // Minimum processing time for visual effect as requested
          const apiPromise = transformToVanGogh(base64);
          const delayPromise = new Promise(resolve => setTimeout(resolve, 3500));
          
          const [processedUrl] = await Promise.all([apiPromise, delayPromise]);
          
          setResult({
            originalUrl: base64,
            processedUrl: processedUrl as string
          });
          setStage(AppStage.RESULT);
        } catch (err) {
          setError("عذراً، حدث خطأ أثناء معالجة اللوحة. حاول مرة أخرى.");
          setStage(AppStage.UPLOAD);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("خطأ في قراءة الصورة.");
      setStage(AppStage.UPLOAD);
    }
  }, []);

  const reset = () => {
    setStage(AppStage.UPLOAD);
    setResult(null);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8 max-w-5xl">
        {stage === AppStage.UPLOAD && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <Hero />
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center font-bold">
                {error}
              </div>
            )}
            <ImageUploader onUpload={handleImageUpload} />
          </div>
        )}

        {stage === AppStage.PROCESSING && (
          <ProcessingView />
        )}

        {stage === AppStage.RESULT && result && (
          <div className="space-y-12 animate-in slide-in-from-bottom duration-700">
            <ResultView result={result} onReset={reset} />
            <CTA />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default App;
