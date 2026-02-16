
import React from 'react';

interface IntroProps {
  onStart: () => void;
}

const Intro: React.FC<IntroProps> = ({ onStart }) => {
  return (
    <div className="w-full text-center space-y-6 md:space-y-12 animate-slide-in py-4 md:py-8 flex flex-col items-center">
      <div className="space-y-3 md:space-y-6">
        <h2 className="text-xs md:text-2xl font-extrabold text-[#c5a059] leading-tight font-almarai uppercase">
  رحلة اكتشاف الذات الإبداعية
</h2>
        <h1 className="text-3xl md:text-7xl font-black font-cairo leading-tight text-[#4a4e4d] drop-shadow-sm px-2">
          هل تختبئ بداخلك <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8fa68c] to-[#c5a059]">روح فنان؟</span>
        </h1>
      </div>

      <div className="relative group w-full max-w-[280px] md:max-w-2xl mx-auto overflow-hidden rounded-[2rem] md:rounded-[4rem] shadow-xl border-4 border-white/50 transform -rotate-1 md:rotate-0">
        <img 
          src="https://h.top4top.io/p_3692uxm2y1.png" 
          alt="Artistic Inspiration" 
          className="w-full aspect-square md:aspect-[16/9] object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#8fa68c]/20 to-transparent" />
      </div>

      <div className="max-w-xl mx-auto space-y-6 md:space-y-8 px-4">
        <p className="text-sm md:text-xl text-[#6b7280] font-almarai leading-relaxed font-medium">
          انضم إلينا في تجربة بصرية فريدة لنكتشف معاً ملامح فنانك الداخلي. عشرة أسئلة، ورؤية واحدة لمستقبلك الإبداعي.
        </p>

        <button
          onClick={onStart}
          className="group relative inline-flex items-center justify-center px-8 md:px-14 py-4 md:py-6 font-bold text-white transition-all duration-500 bg-[#8fa68c] rounded-full hover:bg-[#c5a059] shadow-xl w-full md:w-auto overflow-hidden"
        >
          <div className="absolute inset-0 w-full h-full bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <span className="relative flex items-center justify-center gap-3 font-cairo text-lg md:text-3xl">
            ابدأ الرحلة الآن ✨
          </span>
        </button>
      </div>
    </div>
  );
};

export default Intro;
