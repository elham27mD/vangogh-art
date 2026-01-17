
import React from 'react';

const Hero: React.FC = () => {
  return (
    <div className="text-center space-y-6">
      <h1 className="text-4xl md:text-6xl font-black text-[#1a237e] drop-shadow-sm">
        ماذا لو رسمك فان جوخ؟
      </h1>
      <p className="text-xl md:text-2xl font-medium text-slate-600 max-w-2xl mx-auto leading-relaxed">
        حوّل صورك المفضلة إلى لوحات زيتية خالدة، واستلهم فنك الخاص.
      </p>
      <div className="pt-4">
        <span className="bg-[#fbc02d] text-[#1a237e] px-8 py-3 rounded-full font-black text-xl shadow-lg hover:scale-105 transition-transform cursor-default inline-block">
          اكتشف الفنان بداخلك
        </span>
      </div>
    </div>
  );
};

export default Hero;
