import React, { useState, useEffect, useRef } from 'react';
import { Word } from '../types';
import { playAudio, shuffleArray, speakText } from '../utils/helpers';
import { GoogleGenAI } from "@google/genai";

interface MultipleChoiceProps {
  word: Word;
  allWords: Word[];
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
  progress: { current: number; total: number; reviewCount: number };
}

type Step = 'choose' | 'sentence';

const MultipleChoice: React.FC<MultipleChoiceProps> = ({ word, allWords, onAnswer, onNext, progress }) => {
  const [options, setOptions] = useState<Word[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [shakeId, setShakeId] = useState<number | null>(null); 
  const [step, setStep] = useState<Step>('choose');
  const [sentencePassed, setSentencePassed] = useState(false);
  
  const [sentence, setSentence] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);

  const timerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Reset state for new word
    setSelectedId(null);
    setIsAnswered(false);
    setFeedbackMsg(null);
    setSentence('');
    setAiFeedback(null);
    setAiLoading(false);
    setIsSuggesting(false);
    setIsRewriting(false);
    setShakeId(null);
    setStep('choose');
    setSentencePassed(false);
    
    if (timerRef.current) clearTimeout(timerRef.current);

    const others = allWords.filter(w => w.id !== word.id);
    const distractors = shuffleArray(others).slice(0, 3);
    const currentOptions = shuffleArray([word, ...distractors]);
    setOptions(currentOptions);
  }, [word, allWords]);

  const handleSelect = (optionId: number) => {
    if (isAnswered) return;
    
    setIsAnswered(true);
    setSelectedId(optionId);
    const isCorrect = optionId === word.id;
    onAnswer(isCorrect); // Record SRS result immediately

    if (isCorrect) {
      // CORRECT ANSWER LOGIC
      setFeedbackMsg("✅ Nghĩa đúng! Bây giờ hãy đặt câu để hoàn thành.");
      playAudio('correct');
      speakText(word.term); 
      
      // Switch to sentence mode immediately
      setStep('sentence');
      
      // Focus input after a short delay for transition
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

    } else {
      // WRONG ANSWER LOGIC (Keep existing flow)
      setShakeId(optionId);
      setFeedbackMsg(`❌ Sai, đáp án đúng là: ${word.meaning}`);
      playAudio('wrong');
      
      // Auto next after delay
      timerRef.current = window.setTimeout(() => {
        onNext();
      }, 2000);
    }
  };

  const handleDontKnow = () => {
    if (isAnswered) return;
    setIsAnswered(true);
    setFeedbackMsg(`Đáp án đúng là: ${word.meaning}`);
    playAudio('wrong');
    speakText(word.term); 
    onAnswer(false); // Count as wrong
    timerRef.current = window.setTimeout(onNext, 2000);
  };

  const handleManualNext = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onNext();
  };

  const getAiInstance = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
  };

  const checkSentenceWithGemini = async () => {
    if (!sentence.trim()) return;
    setAiLoading(true);
    setAiFeedback(null);
    setIsRewriting(false);

    try {
      const ai = getAiInstance();
      if (!ai) {
        setAiFeedback({ correct: false, message: "Chưa cấu hình API Key." });
        setAiLoading(false);
        return;
      }

      const prompt = `
        Bạn là một giáo viên tiếng Anh. 
        Từ vựng cần kiểm tra: "${word.term}" (${word.pos}) (nghĩa: ${word.meaning}).
        Câu học sinh đặt: "${sentence}".
        
        Hãy kiểm tra xem câu này có đúng ngữ pháp và sử dụng từ "${word.term}" hợp lý không.
        Trả về kết quả DUY NHẤT là JSON theo định dạng:
        {
          "correct": boolean,
          "message": "Lời nhận xét ngắn gọn bằng tiếng Việt (dưới 30 từ)"
        }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const text = response.text;
      if (text) {
        const result = JSON.parse(text);
        setAiFeedback(result);
        
        if (result.correct) {
            setSentencePassed(true);
            playAudio('correct');
            setFeedbackMsg("🎉 Xuất sắc! Bạn đã hoàn thành từ này.");
        } else {
            playAudio('wrong');
        }
      }
    } catch (error) {
      console.error("AI Error:", error);
      setAiFeedback({ correct: false, message: "Lỗi kết nối AI. Thử lại sau." });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiSuggest = async () => {
    setIsSuggesting(true);
    try {
        const ai = getAiInstance();
        if (!ai) return;

        const prompt = `Đặt một câu tiếng Anh đơn giản, ngắn gọn (dưới 15 từ) và tự nhiên có chứa từ "${word.term}" (với nghĩa: ${word.meaning}). Chỉ trả về duy nhất nội dung câu tiếng Anh đó, không có dấu ngoặc kép, không giải thích gì thêm.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        if (response.text) {
            setSentence(response.text.trim());
            setAiFeedback(null); 
        }
    } catch (error) {
        console.error("Suggest Error", error);
    } finally {
        setIsSuggesting(false);
    }
  };

  const handleAiRewrite = async () => {
    if (!sentence.trim()) return;
    setIsRewriting(true);
    try {
        const ai = getAiInstance();
        if (!ai) return;

        const prompt = `
            Học sinh đã viết câu: "${sentence}". 
            Từ vựng mục tiêu là: "${word.term}". 
            Câu này chưa đúng hoặc chưa hay. Hãy viết lại câu này sao cho đúng ngữ pháp, tự nhiên và giữ nguyên ý định ban đầu của học sinh nhất có thể.
            Chỉ trả về duy nhất câu tiếng Anh đã sửa, không giải thích.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        if (response.text) {
            const fixedSentence = response.text.trim();
            setSentence(fixedSentence);
            // We don't auto-approve rewrite, user must submit
            setAiFeedback({
                correct: false, // Force them to submit again to verify
                message: "Đã sửa giúp bạn. Hãy bấm nút gửi (mũi tên) để kiểm tra lại!"
            });
        }
    } catch (error) {
        console.error("Rewrite Error", error);
    } finally {
        setIsRewriting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Determine if we should show the sentence input section
  // It is always shown in 'sentence' step (correct answer)
  // Or if user wants to just practice (optional in 'choose' step - existing logic retained or hidden? 
  // Based on request: "Chọn đúng thì PHẢI đặt câu". So we emphasize it in 'sentence' step.
  const showSentenceInput = step === 'sentence';

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col items-center w-full animate-fade-in">
      {/* Progress Bar */}
      <div className="w-full mb-6">
        <div className="flex justify-between text-xs text-slate-500 dark:text-gray-300 mb-2 uppercase tracking-wide font-bold">
          <span className={progress.reviewCount > 0 ? "text-yellow-600 dark:text-yellow-400 animate-pulse" : ""}>Review Queue: {progress.reviewCount}</span>
          <span>Mastery Progress</span>
        </div>
        <div className="h-3 bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden flex shadow-inner border border-slate-300 dark:border-slate-600">
            <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out relative" 
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
            >
                <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
            </div>
        </div>
      </div>

      {/* Main Glass Card */}
      <div className={`w-full glass rounded-3xl shadow-2xl mb-8 text-center flex flex-col relative overflow-hidden transition-all duration-500 ${showSentenceInput ? 'ring-4 ring-indigo-500/30 scale-[1.02]' : ''} min-h-[20rem]`}>
        {/* Decorative top glow */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2/3 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent blur-sm"></div>

        <div className="flex flex-col items-center w-full p-8 h-full z-10">
            
            {/* WORD & SPEAKER */}
            <div className="mt-2 mb-4 flex items-center justify-center gap-4 group">
                <h2 className="text-5xl md:text-7xl font-black text-slate-800 dark:text-white tracking-tight drop-shadow-md">
                    {word.term}
                </h2>
                <button 
                    onClick={(e) => { e.stopPropagation(); speakText(word.term); }}
                    className="p-4 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-all shadow-lg hover:scale-110 hover:rotate-12"
                >
                    <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
                </button>
            </div>

            {/* IPA & POS */}
            <div className="mb-8 flex items-center gap-3 justify-center">
                <span className="text-xl text-slate-600 dark:text-slate-300 font-mono bg-slate-200/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 px-4 py-1 rounded-xl backdrop-blur-sm">
                    {word.ipa}
                </span>
                {word.pos && (
                  <span className="text-lg italic text-indigo-500 dark:text-indigo-300 font-serif font-medium">
                    {word.pos}
                  </span>
                )}
            </div>

            {/* AI Sentence Practice Input - HIDDEN until correct answer */}
            {showSentenceInput && (
                <div className="w-full max-w-lg animate-fade-in-up">
                    <div className="mb-2 text-indigo-600 dark:text-indigo-300 font-bold text-sm uppercase tracking-wide animate-pulse">
                        Make a sentence to continue
                    </div>
                    <div className="bg-white/60 dark:bg-black/30 rounded-2xl p-4 border border-indigo-400/50 dark:border-indigo-500/50 shadow-lg backdrop-blur-md transition-all focus-within:ring-2 focus-within:ring-indigo-400/50">
                        <div className="relative flex items-center">
                            <input 
                                ref={inputRef}
                                type="text" 
                                value={sentence}
                                onChange={(e) => setSentence(e.target.value)}
                                placeholder="Type your sentence here..."
                                className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-white py-2 pr-10 text-lg placeholder-slate-400 font-medium"
                                onKeyDown={(e) => e.key === 'Enter' && checkSentenceWithGemini()}
                                disabled={sentencePassed} // Disable input if already passed
                            />
                            <button 
                                onClick={checkSentenceWithGemini}
                                disabled={aiLoading || !sentence || sentencePassed}
                                className="absolute right-0 p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                            >
                                {aiLoading ? (
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : sentencePassed ? (
                                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                                )}
                            </button>
                        </div>
                        
                        <div className="mt-3 flex justify-between items-start gap-2 min-h-[24px]">
                            {!aiFeedback && !sentencePassed && (
                                <button 
                                    onClick={handleAiSuggest}
                                    disabled={isSuggesting}
                                    className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200 transition-colors flex items-center gap-1"
                                >
                                    {isSuggesting ? 'Thinking...' : '💡 Suggestion'}
                                </button>
                            )}

                            {aiFeedback && (
                                <div className={`w-full text-sm text-left p-3 rounded-xl border animate-fade-in-up flex flex-col ${aiFeedback.correct ? 'bg-green-100/50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200' : 'bg-red-100/50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'}`}>
                                    <div>
                                        <strong className="block mb-1 text-base">{aiFeedback.correct ? '🎉 Great job!' : '🤔 Needs improvement'}</strong>
                                        {aiFeedback.message}
                                    </div>
                                    
                                    {!aiFeedback.correct && (
                                        <button 
                                            onClick={handleAiRewrite}
                                            disabled={isRewriting}
                                            className="mt-2 self-end text-xs px-3 py-1.5 bg-white/80 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 rounded-lg border border-current transition-all flex items-center gap-1 font-bold shadow-sm"
                                        >
                                            {isRewriting ? 'Fixing...' : '✨ Fix it for me'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
      </div>

      {/* Options Grid - Hide if we are in sentence mode (to focus user), or keep them disabled */}
      {step === 'choose' && (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 animate-fade-in">
            {options.map(option => {
                let btnClass = "relative overflow-hidden p-5 rounded-2xl text-lg font-semibold transition-all duration-300 border-2 text-left h-24 flex items-center justify-center shadow-md group ";
                
                if (isAnswered) {
                    if (option.id === word.id) {
                        btnClass += "bg-green-500 border-green-500 text-white shadow-green-500/40 scale-[1.02]";
                    } else if (option.id === selectedId) {
                        btnClass += "bg-red-500 border-red-500 text-white shadow-red-500/40";
                    } else {
                        btnClass += "glass border-transparent text-gray-400 dark:text-gray-500 opacity-50 grayscale";
                    }
                } else {
                    btnClass += "glass border-white/40 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-white/80 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-xl hover:-translate-y-1";
                }
                
                const isShaking = shakeId === option.id;

                return (
                    <button
                        key={option.id}
                        onClick={() => handleSelect(option.id)}
                        disabled={isAnswered}
                        className={`${btnClass} ${isShaking ? 'animate-shake' : ''}`}
                    >
                    <span className="relative z-10 line-clamp-2 text-center">{option.meaning}</span>
                    {/* Hover Gradient Effect */}
                    {!isAnswered && <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>}
                    </button>
                );
            })}
        </div>
      )}

      {/* Footer Controls */}
      <div className="h-14 flex items-center justify-center w-full">
        {step === 'choose' && !isAnswered ? (
          <button 
            onClick={handleDontKnow}
            className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-medium transition-colors border-b-2 border-dotted border-slate-400 hover:border-slate-800 dark:hover:border-white pb-0.5"
          >
            I don't know this word
          </button>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-6 w-full justify-between animate-fade-in-up">
            <div className={`font-bold text-xl ${feedbackMsg?.startsWith('✅') || feedbackMsg?.startsWith('🎉') ? 'text-green-500 dark:text-green-400 drop-shadow' : 'text-red-500 dark:text-red-400 drop-shadow'}`}>
                {feedbackMsg}
            </div>
            
            {/* LOGIC: 
                - If Wrong Answer (Step choose + isAnswered + !correct): Button shows 'Next Word' (or handled by timer)
                - If Correct Answer (Step sentence): Button shows 'Next Word' ONLY IF sentencePassed is true.
            */}
            {(step === 'choose' && isAnswered) || (step === 'sentence' && sentencePassed) ? (
                <button 
                    onClick={handleManualNext}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 font-bold flex items-center group transition-all transform hover:scale-105 active:scale-95"
                >
                    Next Word
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultipleChoice;