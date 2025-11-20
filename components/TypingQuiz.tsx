import React, { useState, useEffect, useRef } from 'react';
import { Word } from '../types';
import { playAudio, speakText } from '../utils/helpers';

interface TypingQuizProps {
  word: Word;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
  progress: { reviewCount: number };
}

const TypingQuiz: React.FC<TypingQuizProps> = ({ word, onAnswer, onNext, progress }) => {
  const [input, setInput] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<React.ReactNode>(null);
  const [statusColor, setStatusColor] = useState<'neutral' | 'success' | 'error'>('neutral');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setInput('');
    setIsAnswered(false);
    setFeedbackMsg(null);
    setStatusColor('neutral');
    if (timerRef.current) clearTimeout(timerRef.current);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [word]);

  const ResultContent = ({ label, correct }: { label: string, correct: boolean }) => (
    <div className="flex items-center justify-center gap-3 flex-wrap">
      <span className="font-bold opacity-80">{label}</span> 
      <strong className="text-2xl underline decoration-2 underline-offset-4">{word.term}</strong> 
      <span className="text-lg font-mono text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 rounded">{word.ipa}</span>
      <button 
        onClick={() => speakText(word.term)}
        className={`p-2 rounded-full transition-all hover:scale-110 shadow-sm ${correct ? 'text-green-700 bg-green-200 hover:bg-green-300' : 'text-red-700 bg-red-200 hover:bg-red-300'}`}
        title="Nghe phát âm"
      >
         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
      </button>
    </div>
  );

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isAnswered) return;

    const cleanInput = input.trim().toLowerCase();
    const cleanAnswer = word.term.trim().toLowerCase();
    const isCorrect = cleanInput === cleanAnswer;

    setIsAnswered(true);
    onAnswer(isCorrect);

    if (isCorrect) {
      setFeedbackMsg(<ResultContent label="✅ Chính xác!" correct={true} />);
      setStatusColor('success');
      playAudio('correct');
      speakText(word.term);
    } else {
      setFeedbackMsg(<ResultContent label="❌ Sai rồi. Đáp án:" correct={false} />);
      setStatusColor('error');
      playAudio('wrong');
    }

    timerRef.current = window.setTimeout(onNext, 2000);
  };

  const handleDontKnow = () => {
    if (isAnswered) return;
    setIsAnswered(true);
    setInput('');
    setFeedbackMsg(<ResultContent label="Đáp án là:" correct={false} />);
    setStatusColor('error');
    playAudio('wrong');
    speakText(word.term);
    onAnswer(false);
    timerRef.current = window.setTimeout(onNext, 2500);
  };

  const handleManualNext = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onNext();
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col items-center w-full animate-fade-in">
       <div className="w-full flex justify-end mb-6">
        <span className={`glass px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-colors shadow-sm ${progress.reviewCount > 0 ? 'text-yellow-600 dark:text-yellow-400 border-yellow-400/50 bg-yellow-50/50 dark:bg-yellow-900/20' : 'text-slate-400 border-slate-200 dark:border-slate-700'}`}>
          Review Queue: {progress.reviewCount}
        </span>
      </div>

      {/* Question Card */}
      <div className="w-full glass-strong rounded-3xl p-10 mb-8 text-center shadow-2xl h-72 flex flex-col justify-center items-center relative transition-all duration-300 group hover:shadow-indigo-500/20">
        {/* Decorative accents */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-70"></div>
        
        <p className="text-indigo-500 dark:text-indigo-400 uppercase tracking-widest text-xs font-bold mb-6 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg">Type in English</p>
        <h2 className="text-3xl md:text-5xl font-black text-slate-800 dark:text-white leading-tight break-words w-full flex-grow flex items-center justify-center drop-shadow-sm">
            {word.meaning}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xl relative group">
        <div className={`absolute -inset-1 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500 ${statusColor !== 'neutral' ? 'opacity-0' : ''}`}></div>
        <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isAnswered}
            placeholder="Type answer here..."
            className={`relative w-full bg-white dark:bg-slate-800/90 text-3xl p-6 rounded-xl border-2 outline-none transition-all text-center font-bold shadow-lg
                ${statusColor === 'neutral' ? 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-800 dark:text-white' : ''}
                ${statusColor === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 ring-4 ring-green-500/20' : ''}
                ${statusColor === 'error' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 ring-4 ring-red-500/20 animate-shake' : ''}
            `}
            autoComplete="off"
        />
        
        {!isAnswered && input.length > 0 && (
             <button 
             type="submit"
             className="absolute right-4 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
           >
             Check
           </button>
        )}
      </form>

      <div className="h-24 mt-8 w-full flex items-center justify-center">
        {!isAnswered ? (
          <button 
            onClick={handleDontKnow}
            type="button"
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white font-semibold transition-colors flex items-center gap-2 group"
          >
            <span>I don't know</span>
            <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
          </button>
        ) : (
          <div className="flex flex-col items-center w-full animate-fade-in-up">
            <div className="text-lg mb-4 text-slate-800 dark:text-white bg-white/50 dark:bg-black/40 px-6 py-3 rounded-xl border border-white/20 backdrop-blur shadow-sm">{feedbackMsg}</div>
            <button 
                onClick={handleManualNext}
                className="px-8 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-white dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl transition-all shadow-md hover:shadow-xl font-bold"
            >
                Continue (Enter)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TypingQuiz;