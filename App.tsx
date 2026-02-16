
import React, { useState, useCallback } from 'react';
import { AppState, UserResponse, AnswerValue } from './types';
import { QUESTIONS, LOGO_URL } from './constants';
import Intro from './components/Intro';
import Quiz from './components/Quiz';
import Result from './components/Result';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.INTRO);
  const [responses, setResponses] = useState<UserResponse[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const startQuiz = useCallback(() => {
    setAppState(AppState.QUIZ);
    setResponses([]);
    setCurrentQuestionIndex(0);
  }, []);

  const handleAnswer = useCallback((answer: AnswerValue) => {
    const currentQuestion = QUESTIONS[currentQuestionIndex];
    
    setResponses(prev => {
      const existingIndex = prev.findIndex(r => r.questionId === currentQuestion.id);
      if (existingIndex > -1) {
        const newResponses = [...prev];
        newResponses[existingIndex] = { ...newResponses[existingIndex], answer };
        return newResponses;
      }
      return [...prev, { questionId: currentQuestion.id, answer }];
    });

    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setAppState(AppState.RESULT);
    }
  }, [currentQuestionIndex]);

  const goToPrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else {
      setAppState(AppState.INTRO);
    }
  }, [currentQuestionIndex]);

  const goToNext = useCallback(() => {
    const currentQuestion = QUESTIONS[currentQuestionIndex];
    const isAnswered = responses.some(r => r.questionId === currentQuestion.id);
    
    if (isAnswered) {
      if (currentQuestionIndex < QUESTIONS.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        setAppState(AppState.RESULT);
      }
    }
  }, [currentQuestionIndex, responses]);

  const restart = useCallback(() => {
    setAppState(AppState.INTRO);
  }, []);

  return (
    <div className="min-h-screen w-full relative bg-[#f2f0e6] text-slate-800 transition-colors duration-500 overflow-x-hidden">
      {/* Optimized Header for Mobile */}
      <header className="absolute top-0 left-0 w-full flex justify-center py-4 md:py-6 z-50">
        <img 
          src={LOGO_URL} 
          alt="إلهامك للرسم" 
          className="h-10 md:h-20 object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105" 
        />
      </header>

      <main className="relative z-10 w-full max-w-5xl mx-auto min-h-screen flex items-start md:items-center justify-center p-3 md:p-6 pt-20 md:pt-32">
        <div className="w-full flex flex-col items-center">
          {appState === AppState.INTRO && <Intro onStart={startQuiz} />}
          
          {appState === AppState.QUIZ && (
            <Quiz 
              currentQuestion={QUESTIONS[currentQuestionIndex]}
              currentIndex={currentQuestionIndex}
              totalQuestions={QUESTIONS.length}
              onAnswer={handleAnswer}
              onPrevious={goToPrevious}
              onNext={goToNext}
              canGoNext={responses.some(r => r.questionId === QUESTIONS[currentQuestionIndex].id)}
            />
          )}

          {appState === AppState.RESULT && (
            <Result onRestart={restart} />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
