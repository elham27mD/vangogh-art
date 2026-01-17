
import React from 'react';

const CTA: React.FC = () => {
  return (
    <div className="bg-[#1a237e] text-white rounded-3xl p-8 md:p-12 shadow-2xl starry-night-gradient relative overflow-hidden">
      {/* Decorative Swirls */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 opacity-10 rounded-full blur-3xl -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500 opacity-10 rounded-full blur-3xl -ml-20 -mb-20"></div>

      <div className="relative z-10 text-center space-y-8">
        <div className="space-y-4 max-w-3xl mx-auto">
          <p className="text-2xl md:text-3xl font-bold leading-relaxed text-yellow-50">
            فان جوخ صنع أسلوبه بنفسه! 🖌️✨
          </p>
          <p className="text-3xl md:text-4xl font-black text-[#fbc02d] drop-shadow-lg leading-tight">
            والدور عليك الحين ايش منتظر!
          </p>
          <p className="text-xl md:text-2xl font-medium text-blue-50 leading-relaxed">
            وجودك هنا مو صدفة.. أنت وصلت هنا لأن دفتر إلهامك للرسم هو طريقك، اشتريه الان واكتشف بصمتك اللي بتغير العالم.
          </p>
        </div>

        <div className="pt-4">
          <a 
            href="https://salla.sa/elhamk23" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block bg-[#fbc02d] text-[#1a237e] px-16 py-6 rounded-full text-3xl font-black shadow-[0_10px_30px_rgba(251,192,45,0.4)] hover:scale-110 hover:shadow-[0_15px_40px_rgba(251,192,45,0.6)] transition-all animate-bounce"
          >
            تسوق الآن
          </a>
        </div>
      </div>
    </div>
  );
};

export default CTA;
