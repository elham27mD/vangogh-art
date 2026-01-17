
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-100 py-10 border-t border-slate-200">
      <div className="container mx-auto px-4 text-center space-y-4">
        <p className="text-slate-600 font-medium">
          تم التطوير بكل حب وإبداع بواسطة <span className="text-[#1a237e] font-bold">[إلهام العطار]</span>
        </p>
        <p className="text-slate-400 text-sm">
          جميع الحقوق محفوظة لـ إلهامك للرسم © 2026
        </p>
        
        <div className="flex justify-center gap-4 pt-4">
           {/* Social Icons Placeholders */}
           <div className="w-8 h-8 rounded-full bg-slate-300"></div>
           <div className="w-8 h-8 rounded-full bg-slate-300"></div>
           <div className="w-8 h-8 rounded-full bg-slate-300"></div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
