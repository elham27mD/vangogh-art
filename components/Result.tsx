
import React, { useState } from 'react';
import { PRODUCT_URL, LOGO_URL } from '../constants';

interface ResultProps {
  onRestart: () => void;
}

const Result: React.FC<ResultProps> = ({ onRestart }) => {
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = window.location.href;
  const shareText = 'اكتشفت روحي الفنية! لقد أجريت اختبار الروح الفنية واكتشفت أنني فنان بالفطرة! خض التجربة الآن عبر إلهامك للرسم ✨';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const socialPlatforms = [
    {
      name: 'واتساب',
      icon: (
        <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
      url: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
      color: 'bg-[#25D366]'
    },
    {
      name: 'إكس',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      color: 'bg-black'
    },
    {
      name: 'تليجرام',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18.717-3.956 16.588-3.956 16.588s-.11.45-.5.45c-.21 0-.41-.11-.5-.22-.39-.46-5.83-6.84-5.83-6.84l-2.43 1.19s-.42.21-.75.21c-.42 0-.6-.32-.6-.32l-2.72-8.52s-.15-.47.25-.72c.4-.25 1.03-.21 1.03-.21l15.15-5.83s.47-.18.75-.11c.28.07.45.32.45.62 0 .14-.02.28-.06.41z"/>
        </svg>
      ),
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      color: 'bg-[#0088cc]'
    }
  ];

  return (
    <div className="w-full flex flex-col items-center py-4 md:py-10 animate-slide-in space-y-8 md:space-y-20 px-2 md:px-4 relative">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-40 h-40 bg-[#c5a059]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-60 h-60 bg-[#8fa68c]/15 rounded-full blur-3xl" />
      </div>

      {/* Main Result Card */}
      <div className="w-full max-w-4xl relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#8fa68c]/20 via-[#c5a059]/20 to-[#8fa68c]/20 rounded-[2rem] md:rounded-[5rem] blur-2xl opacity-30"></div>
        
        <div className="relative glass-light rounded-[2rem] md:rounded-[5rem] overflow-hidden shadow-xl border border-white/80 p-0.5">
          <div className="bg-[#f2f0e6] rounded-[1.9rem] md:rounded-[4.8rem] p-6 md:p-24 space-y-8 md:space-y-16 relative overflow-hidden text-center border border-[#d9e2d5]">
            <div className="relative z-10 space-y-6 md:space-y-12">
              
              {/* Logo with Enhanced Magic Aura */}
              <div className="relative inline-block">
                {/* Magic Sparkles Popping Out */}
                <div className="absolute inset-0 pointer-events-none overflow-visible">
                  {[...Array(8)].map((_, i) => (
                    <span 
                      key={i} 
                      className="absolute text-xl md:text-3xl animate-bounce" 
                      style={{ 
                        top: `${Math.random() * 100}%`, 
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${i * 0.4}s`,
                        animationDuration: `${2 + Math.random() * 2}s`,
                        opacity: 0.8
                      }}
                    >
                      ✨
                    </span>
                  ))}
                </div>

                {/* Larger Logo Container */}
                <div className="p-1 md:p-2 rounded-full bg-gradient-to-tr from-[#8fa68c] via-[#c5a059] to-[#8fa68c] animate-float shadow-[0_0_50px_rgba(197,160,89,0.4)]">
                  <div className="bg-white p-4 md:p-10 rounded-full flex items-center justify-center overflow-hidden border-4 border-[#f2f0e6]">
                     <img 
                      src={LOGO_URL} 
                      alt="Logo" 
                      className="h-28 w-28 md:h-72 md:w-72 object-contain transform transition-transform group-hover:scale-110 duration-1000"
                     />
                  </div>
                </div>
                
                {/* Magical Glow Ring */}
                <div className="absolute inset-0 -m-4 md:-m-10 border-2 border-dashed border-[#c5a059]/30 rounded-full animate-[spin_10s_linear_infinite]" />
              </div>
              
              <div className="space-y-4">
                <h1 className="text-3xl md:text-8xl font-black font-cairo leading-tight text-[#4a4e4d] tracking-tight">
                   أنت <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8fa68c] to-[#c5a059]">فنان بالفطرة..</span>
                   <br/> والآن وقت الظهور!
                </h1>
                <p className="text-[#c5a059] font-bold tracking-widest text-xs md:text-2xl uppercase font-almarai">
                  مبارك! لقد اجتزت اختبار الروح الفنية بنجاح
                </p>
              </div>

              <div className="relative max-w-2xl mx-auto">
                <div className="bg-white/40 backdrop-blur-xl border border-white p-6 md:p-14 rounded-[1.5rem] md:rounded-[3.5rem] italic text-[#4a4e4d]/80 text-base md:text-3xl font-almarai leading-relaxed shadow-sm">
                  إجاباتك تؤكد أنك تملك عيناً تلتقط الجمال وعقلاً لا يتوقف عن التخيّل. الفوضى التي بداخلك هي بداية الإبداع، وكل ما تحتاجه الآن هو <span className="text-[#8fa68c] font-black not-italic underline decoration-[#c5a059] decoration-2 underline-offset-4">"المساحة"</span> التي تحتضن هذه الأفكار.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section - Magnetic Design */}
      <div className="w-full max-w-5xl text-center space-y-10 md:space-y-16 z-10 px-1">
        <div className="space-y-4">
          <div className="inline-block px-6 py-2 rounded-full bg-white border border-[#8fa68c]/30 text-[#8fa68c] text-xs md:text-lg font-bold shadow-sm">
            ✨ الخطوة التالية في رحلتك الإبداعية ✨
          </div>
          <h3 className="text-2xl md:text-6xl font-black font-cairo text-[#4a4e4d] leading-tight px-2">
            توقف عن انتظار الإلهام، وابدأ برسمه، <span className="text-[#c5a059] text-4xl md:text-8xl drop-shadow-sm px-1 inline-block">100</span> فكرة بانتظار لمستك الخاصة
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12 w-full items-stretch">
          
          {/* Enhanced Magnetic Purchase Card */}
          <a
            href={PRODUCT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col items-center justify-center p-8 md:p-16 rounded-[2.5rem] md:rounded-[5rem] transition-all duration-700 hover:scale-[1.02] shadow-2xl overflow-hidden border-2 border-[#c5a059]/30"
          >
            {/* Dynamic Halo Layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#8fa68c] via-[#7a8f77] to-[#c5a059] opacity-95 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] mix-blend-overlay" />
            
            {/* Magnetic Attraction Glows */}
            <div className="absolute inset-[-50%] bg-gradient-to-tr from-white/20 via-transparent to-[#c5a059]/40 blur-[120px] animate-pulse-slow" />
            
            <div className="relative z-20 flex flex-col items-center gap-8 md:gap-12 w-full">
              {/* Central Magnetic Focus */}
              <div className="relative transform transition-all duration-700 group-hover:scale-110 group-hover:rotate-1">
                {/* Aura Radiance */}
                <div className="absolute inset-[-40px] md:inset-[-80px] bg-white/40 rounded-full blur-[50px] md:blur-[100px] animate-pulse group-hover:scale-125 transition-transform" />
                
                {/* Product Image Container */}
                <div className="relative bg-white/30 backdrop-blur-2xl p-6 md:p-12 rounded-[3rem] md:rounded-[5rem] border-2 border-white/50 shadow-[0_40px_80px_rgba(0,0,0,0.2)] group-hover:shadow-[0_60px_120px_rgba(255,255,255,0.4)] transition-all duration-500 overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
                   <img 
                    src="https://h.top4top.io/p_36928mf241.png" 
                    alt="Inspiration Notebook Box Set" 
                    className="w-48 md:w-80 h-auto object-contain drop-shadow-[0_25px_50px_rgba(0,0,0,0.4)] relative z-10"
                   />
                </div>
              </div>

              <div className="text-center space-y-4 md:space-y-6">
                <div className="text-white font-black font-cairo text-3xl md:text-5xl drop-shadow-[0_5px_15px_rgba(0,0,0,0.3)]">
                   اقتنِ <span className="text-[#f2f0e6] underline decoration-[#c5a059] decoration-wavy underline-offset-8">دفتر إلهامك</span> الآن
                </div>
                <div className="text-[#f2f0e6]/95 text-sm md:text-2xl font-almarai max-w-xs md:max-w-md mx-auto leading-relaxed font-bold">
                  ابدأ بتوثيق أعظم أفكارك في المساحة التي صُممت خصيصاً لأجلك.
                </div>
                
                <div className="mt-8 md:mt-12 inline-flex items-center gap-3 px-10 py-5 bg-white text-[#8fa68c] rounded-full font-black text-lg md:text-2xl shadow-2xl group-hover:bg-[#c5a059] group-hover:text-white group-hover:-translate-y-2 transition-all duration-500 animate-bounce" style={{ animationDuration: '3s' }}>
                   انطلق نحو الإبداع ➔
                </div>
              </div>
            </div>

            {/* Sweep Shine */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
          </a>

          {/* Secondary Actions Column */}
          <div className="flex flex-col gap-5 md:gap-8">
            
            {/* Share Module */}
            <div className="relative">
              <button
                onClick={() => setShowShareOptions(!showShareOptions)}
                className="flex items-center justify-between w-full p-6 md:p-10 bg-white border-2 border-[#d9e2d5] rounded-[2rem] md:rounded-[4rem] shadow-md transition-all active:scale-95 group"
              >
                <div className="flex items-center gap-6 md:gap-10 text-right">
                  <div className="bg-[#f2f0e6] p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] group-hover:scale-110 transition-transform">
                    <span className="text-3xl md:text-6xl">✨</span>
                  </div>
                  <div>
                    <div className="text-[#4a4e4d] font-black font-cairo text-xl md:text-4xl mb-1">شارك نتيجتك</div>
                    <div className="text-[#6b7280] text-xs md:text-xl font-medium font-almarai">ألهم من حولك بروحك الفنية</div>
                  </div>
                </div>
                <span className={`text-[#c5a059] transition-transform duration-300 text-2xl md:text-5xl ${showShareOptions ? 'rotate-90' : ''}`}>❮</span>
              </button>

              {showShareOptions && (
                <div className="absolute bottom-[calc(100%+1rem)] left-0 w-full p-6 bg-white/95 backdrop-blur-xl rounded-[2rem] md:rounded-[4rem] border-2 border-[#d9e2d5] shadow-2xl animate-slide-in grid grid-cols-4 gap-4 z-50">
                  {socialPlatforms.map((platform) => (
                    <a
                      key={platform.name}
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-3 group/icon"
                    >
                      <div className={`w-12 h-12 md:w-24 md:h-24 flex items-center justify-center rounded-2xl md:rounded-[2rem] text-white shadow-md group-hover/icon:-translate-y-2 transition-transform ${platform.color}`}>
                        {platform.icon}
                      </div>
                      <span className="text-[10px] md:text-base font-bold text-[#4a4e4d] font-almarai">{platform.name}</span>
                    </a>
                  ))}
                  <button onClick={copyToClipboard} className="flex flex-col items-center gap-3 group/icon">
                    <div className="w-12 h-12 md:w-24 md:h-24 flex items-center justify-center rounded-2xl md:rounded-[2rem] bg-slate-800 text-white shadow-md group-hover/icon:-translate-y-2 transition-transform">
                      {copied ? '✅' : '🔗'}
                    </div>
                    <span className="text-[10px] md:text-base font-bold text-[#4a4e4d] font-almarai">{copied ? 'تم!' : 'رابط'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Restart Button */}
            <button
              onClick={onRestart}
              className="flex items-center justify-between p-6 md:p-10 bg-[#f2f0e6]/60 border-2 border-transparent rounded-[2rem] md:rounded-[4rem] active:bg-white transition-all shadow-sm group"
            >
              <div className="flex items-center gap-6 md:gap-10">
                <div className="bg-[#d9e2d5]/40 p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] group-hover:rotate-180 transition-transform duration-700">
                  <span className="text-3xl md:text-6xl">🔄</span>
                </div>
                <div className="text-right">
                  <div className="text-[#6b7280] font-black font-almarai text-xl md:text-4xl">إعادة التجربة</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="pt-12 md:pt-24">
          <p className="text-[#8fa68c] font-almarai text-xs md:text-xl font-bold tracking-widest uppercase flex items-center justify-center gap-4 opacity-70">
            إلهامك للرسم © {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {copied && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 bg-[#4a4e4d] text-white rounded-full font-bold shadow-2xl animate-bounce z-[100] text-sm md:text-lg font-almarai border border-white/10 backdrop-blur-lg">
          تم نسخ الرابط.. شاركه الآن! 🎨
        </div>
      )}
    </div>
  );
};

export default Result;
