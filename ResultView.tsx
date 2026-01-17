
import React from 'react';
import { GenerationResult } from '../types';

interface Props {
  result: GenerationResult;
  onReset: () => void;
}

const ResultView: React.FC<Props> = ({ result, onReset }) => {
  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = result.processedUrl;
    link.download = 'van-gogh-masterpiece.png';
    link.click();
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Original Image (Right for RTL) */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-center text-slate-500">الصورة الأصلية</h3>
          <div className="rounded-lg overflow-hidden shadow-lg border-4 border-white aspect-square bg-slate-100">
            <img 
              src={result.originalUrl} 
              alt="Original" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Processed Image (Left for RTL) */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-center text-[#1a237e]">تحفة فان جوخ</h3>
          <div className="relative group p-4 bg-[#fbc02d] rounded-sm shadow-2xl">
            {/* Ornate Frame Effect */}
            <div className="absolute inset-0 border-8 border-double border-[#ef6c00] pointer-events-none"></div>
            <div className="aspect-square bg-white overflow-hidden shadow-inner border-2 border-[#1a237e]">
              <img 
                src={result.processedUrl} 
                alt="Van Gogh Style" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute inset-0 pointer-events-none opacity-30 canvas-texture"></div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
        <button 
          onClick={downloadImage}
          className="w-full sm:w-auto bg-[#1a237e] text-white px-10 py-4 rounded-xl font-black text-lg shadow-xl hover:bg-[#0d47a1] transition-all flex items-center justify-center gap-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          حفظ التحفة
        </button>
        <button 
          onClick={onReset}
          className="w-full sm:w-auto bg-white text-[#1a237e] border-2 border-[#1a237e] px-10 py-4 rounded-xl font-black text-lg shadow-md hover:bg-slate-50 transition-all"
        >
          جرب صورة أخرى
        </button>
      </div>
    </div>
  );
};

export default ResultView;
