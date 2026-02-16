
import React, { useEffect, useState } from 'react';
import { Question, AnswerValue } from '../types';
import { ANSWERS, STORE_URL } from '../constants';

interface QuizProps {
  currentQuestion: Question;
  currentIndex: number;
  totalQuestions: number;
  onAnswer: (answer: AnswerValue) => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoNext: boolean;
}

const Quiz: React.FC<QuizProps> = ({ currentQuestion, currentIndex, totalQuestions, onAnswer, onPrevious, onNext, canGoNext }) => {
  const progressPercentage = Math.round((currentIndex / totalQuestions) * 100);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [sliderValue, setSliderValue] = useState(6);

  useEffect(() => {
    setImageLoaded(false);
    setSliderValue(6);
  }, [currentIndex]);

  const renderInteraction = () => {
    if (currentQuestion.type === 'slider') {
      const handlePosition = ((sliderValue - 1) / 10) * 100;

      return (
        <div className="w-full max-w-2xl mx-auto space-y-6 md:space-y-12 animate-slide-in px-2 py-2" dir="ltr">
          <div className="relative pt-6 md:pt-10">
            <div className="relative h-2.5 bg-[#d9e2d5] rounded-full w-full">
              <div className="absolute inset-0 flex justify-between px-0">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num) => (
                  <div key={num} className="relative flex flex-col items-center h-full">
                    <div className="w-[1.5px] h-2.5 md:h-5 bg-[#c5a059]/40 absolute -top-1" />
                    <span className="absolute top-5 text-[9px] md:text-sm font-bold text-[#8fa68c] font-almarai">
                      {num}
                    </span>
                  </div>
                ))}
              </div>

              <input
                type="range"
                min="1"
                max="11"
                step="1"
                value={sliderValue}
                onChange={(e) => setSliderValue(parseInt(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
              />

              <div 
                className="absolute top-1/2 -translate-y-1/2 w-8 h-8 md:w-16 md:h-16 bg-white border-2 md:border-[4px] border-[#c5a059] rounded-full shadow-lg flex items-center justify-center transition-all duration-150 ease-out z-20 pointer-events-none"
                style={{ left: `${handlePosition}%`, transform: 'translate(-50%, -50%)' }}
              >
                <div className="flex items-center justify-center text-[#c5a059] gap-0.5 font-bold text-[10px] md:text-xl">
                  <span className="scale-x-75">❮</span>
                  <span className="scale-x-75">❯</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-10 md:mt-24 px-0 text-xs md:text-2xl font-bold text-[#4a4e4d] font-almarai" dir="rtl">
               <span className="text-right">نادرًا</span>
               <span className="text-center text-[#c5a059]">أحيانًا</span>
               <span className="text-left">دائمًا</span>
            </div>
          </div>

          <div className="text-center pt-4" dir="rtl">
             <button 
               onClick={() => onAnswer(sliderValue)}
               className="bg-[#8fa68c] text-white px-8 md:px-20 py-3 md:py-5 rounded-full font-cairo font-bold hover:bg-[#c5a059] transition-all shadow-xl active:scale-95 text-base md:text-2xl w-full"
             >
               تأكيد الاختيار
             </button>
          </div>
        </div>
      );
    }

    if (currentQuestion.type === 'scale') {
      return (
        <div className="w-full max-w-sm mx-auto space-y-4 animate-slide-in px-2">
          <div className="relative bg-[#4a4e4d] backdrop-blur-md border border-[#c5a059]/30 rounded-2xl flex justify-between items-center px-4 py-4 md:py-6 shadow-xl" dir="ltr">
             {[1, 2, 3, 4, 5].map((val) => (
               <button
                 key={val}
                 onClick={() => onAnswer(val)}
                 className="z-10 text-white font-black text-lg md:text-3xl hover:scale-125 hover:text-[#c5a059] transition-all w-10 h-10 md:w-16 md:h-16 flex items-center justify-center rounded-full active:bg-white/20"
               >
                 {val}
               </button>
             ))}
          </div>
          <div className="flex justify-between px-2 text-[10px] md:text-lg font-bold text-[#8fa68c] font-almarai" dir="rtl">
             <span>دائمًا</span>
             <span>أحيانًا</span>
             <span>نادرًا</span>
          </div>
        </div>
      );
    }

    const availableAnswers = currentQuestion.answers || ANSWERS;

    return (
      <div className="flex flex-col gap-3 max-w-md mx-auto w-full px-2 animate-slide-in">
        {availableAnswers.map((option, idx) => (
          <button
            key={option.id}
            onClick={() => onAnswer(option.id as any)}
            className="group relative flex items-center justify-between w-full p-0 text-right font-almarai text-sm md:text-xl bg-white/70 backdrop-blur-md border-2 border-transparent rounded-xl transition-all duration-300 shadow-sm hover:border-[#c5a059]/30 active:scale-[0.98] overflow-hidden"
          >
            <span className="text-[#4a4e4d] font-bold px-4 md:px-10 py-3.5 md:py-6 flex-grow text-right group-active:text-[#8fa68c]">
              {option.label}
            </span>
            <div className="flex-shrink-0 flex items-center justify-center w-10 md:w-20 h-full bg-[#8fa68c] text-white font-black text-base md:text-3xl min-h-[48px] md:min-h-[72px] transition-colors">
              {idx + 1}
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center min-h-[calc(100vh-120px)] md:py-8 bg-transparent overflow-x-hidden">
      {/* Optimized Slim Footer for Mobile & Desktop */}
      <div className="fixed bottom-0 left-0 w-full p-3 md:px-12 md:py-6 flex flex-col md:flex-row items-center justify-between gap-3 pointer-events-none z-50 bg-[#f2f0e6]/90 backdrop-blur-md border-t border-[#d9e2d5]">
        <div className="flex items-center justify-center md:justify-start gap-3 pointer-events-auto w-full md:w-auto">
           <a href={STORE_URL} target="_blank" rel="noopener noreferrer" className="bg-[#8fa68c] text-white text-[10px] md:text-xs px-5 py-2.5 rounded-xl font-bold shadow-md font-almarai hover:bg-[#c5a059] transition-colors">
             صُنع بشغف : إلهام العطار
           </a>
        </div>
        
        <div className="flex items-center justify-between w-full md:w-auto gap-4 pointer-events-auto px-1">
          <div className="flex items-center gap-3">
             <div className="text-xs md:text-2xl font-black text-[#8fa68c] font-almarai tabular-nums">
               {progressPercentage}%
             </div>
             <div className="relative w-20 md:w-72 h-2 bg-[#d9e2d5] rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-[#8fa68c] to-[#c5a059] transition-all duration-700" 
                  style={{ width: `${progressPercentage}%` }}
                />
             </div>
          </div>

          <div className="flex gap-2">
             <button 
               onClick={onPrevious}
               className="p-2 text-white bg-[#4a4e4d] rounded-lg active:bg-[#8fa68c] transition-all"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 15l7-7 7 7"></path></svg>
             </button>
             <button 
               onClick={onNext}
               disabled={!canGoNext}
               className={`p-2 text-white rounded-lg transition-all ${canGoNext ? 'bg-[#4a4e4d] active:bg-[#8fa68c]' : 'bg-[#4a4e4d]/30 cursor-not-allowed'}`}
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7"></path></svg>
             </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-3xl px-1 md:px-4 space-y-4 md:space-y-10 mb-28 md:mb-32">
        <h2 className="text-lg md:text-4xl font-bold font-almarai text-center text-[#4a4e4d] leading-snug px-3">
          <span className="text-[#c5a059] ml-1">*{currentIndex + 1}-</span>
          {currentQuestion.text}
        </h2>

        <div className="relative mx-auto w-full max-w-[220px] md:max-w-[440px] aspect-square rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-white/40 flex items-center justify-center border-2 border-white/60 shadow-lg">
           {!imageLoaded && (
             <div className="absolute inset-0 bg-[#d9e2d5] animate-pulse flex items-center justify-center">
               <div className="w-8 h-8 border-3 border-[#8fa68c]/30 border-t-[#c5a059] rounded-full animate-spin"></div>
             </div>
           )}
           <img 
             key={currentQuestion.image} 
             src={currentQuestion.image} 
             alt="Visual" 
             className={`w-full h-full object-contain transition-all duration-700 ${imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
             onLoad={() => setImageLoaded(true)}
           />
        </div>

        <div className="w-full">
           {renderInteraction()}
        </div>
      </div>
    </div>
  );
};

export default Quiz;
