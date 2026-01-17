
import React from 'react';

const ProcessingView: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-12">
      <div className="relative w-64 h-64">
        {/* Circular Brush animation */}
        <div className="absolute inset-0 border-8 border-t-[#fbc02d] border-r-[#1a237e] border-b-[#ef6c00] border-l-[#1565c0] rounded-full animate-spin"></div>
        
        {/* Center Canvas */}
        <div className="absolute inset-4 bg-[#fdfaf1] rounded-full flex items-center justify-center overflow-hidden shadow-inner">
           <svg className="w-20 h-20 text-[#1a237e] opacity-40" viewBox="0 0 24 24" fill="currentColor">
             <path d="M7.5 13c1.38 0 2.5 1.12 2.5 2.5S8.88 18 7.5 18 5 16.88 5 15.5 6.12 13 7.5 13m11-9c.34 0 .68.03 1.01.08.84.14 1.49.86 1.49 1.74v12.36c0 .88-.65 1.6-1.49 1.74-.33.05-.67.08-1.01.08-3.04 0-5.5-2.46-5.5-5.5s2.46-5.5 5.5-5.5m-11 5c1.38 0 2.5 1.12 2.5 2.5S8.88 15 7.5 15 5 13.88 5 12.5 6.12 10 7.5 10m0-6c1.38 0 2.5 1.12 2.5 2.5S8.88 9 7.5 9 5 7.88 5 6.5 6.12 4 7.5 4z" />
           </svg>
        </div>
      </div>

      <div className="text-center space-y-4">
        <h2 className="text-3xl font-black text-[#1a237e] animate-pulse">جاري دمج الألوان..</h2>
        <div className="flex justify-center space-x-2 space-x-reverse">
          <div className="w-12 h-2 bg-[#fbc02d] rounded-full animate-brush"></div>
          <div className="w-12 h-2 bg-[#1a237e] rounded-full animate-brush" style={{ animationDelay: '0.4s' }}></div>
          <div className="w-12 h-2 bg-[#ef6c00] rounded-full animate-brush" style={{ animationDelay: '0.8s' }}></div>
        </div>
        <p className="text-slate-500 font-medium">نحول صورتك إلى تحفة فنية بلمسات عالمية</p>
      </div>
    </div>
  );
};

export default ProcessingView;
