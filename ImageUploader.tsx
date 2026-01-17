
import React, { useRef } from 'react';

interface Props {
  onUpload: (file: File) => void;
}

const ImageUploader: React.FC<Props> = ({ onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="group relative cursor-pointer aspect-[4/3] bg-white border-8 border-[#fbc02d] rounded-sm shadow-2xl flex flex-col items-center justify-center space-y-4 p-8 transition-all hover:bg-slate-50 overflow-hidden"
      >
        {/* Artistic Corners */}
        <div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-[#1a237e]"></div>
        <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-[#1a237e]"></div>
        <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-[#1a237e]"></div>
        <div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-[#1a237e]"></div>

        <div className="w-20 h-20 bg-[#1a237e] rounded-full flex items-center justify-center text-white shadow-inner group-hover:scale-110 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>

        <div className="text-center">
          <h3 className="text-2xl font-bold text-[#1a237e]">ارفع صورتك هنا</h3>
          <p className="text-slate-500 mt-2">ابدأ رحلتك الفنية الآن</p>
        </div>

        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20 canvas-texture"></div>
      </div>
      
      <div className="mt-8 text-center">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="bg-[#1a237e] text-white px-12 py-4 rounded-xl text-xl font-bold shadow-xl hover:bg-[#0d47a1] transition-all"
        >
          ارسم صورتي
        </button>
      </div>
    </div>
  );
};

export default ImageUploader;
