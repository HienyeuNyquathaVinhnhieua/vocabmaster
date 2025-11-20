import React, { useState } from 'react';
import { parseVocabularyInput } from '../utils/helpers';
import { Word } from '../types';
import { GoogleGenAI } from "@google/genai";

interface ImportScreenProps {
  onStart: (words: Word[]) => void;
}

const ImportScreen: React.FC<ImportScreenProps> = ({ onStart }) => {
  const [input, setInput] = useState<string>(`take off : cất cánh; cởi (quần áo)
break down : hỏng, sụp đổ
decline : giảm sút
assume : giả định
facilitate : tạo điều kiện
ambiguous : mơ hồ
colleague : đồng nghiệp`);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const enrichWordsWithOxfordData = async (initialWords: Word[]) => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      setError("API Key chưa được cấu hình. Vui lòng kiểm tra file .env.");
      return null;
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Prepare the list for the prompt
    const terms = initialWords.map(w => w.term).join(', ');

    const prompt = `
      I have a list of English vocabulary: [${terms}].
      
      Please act as the Oxford Learner's Dictionary. For each word, look up and provide:
      1. The British English (BrE) IPA with correct stress marks (e.g. /dɪˈklaɪn/).
      2. The Part of Speech (POS) exactly as defined in Oxford (noun, verb, adjective, adverb, phrasal verb, etc.). 
         - If it is a phrase/idiom not strictly defined as a POS, use 'phrase'.
         - If a word has multiple POS, choose the most common one or the one matching this meaning: "${initialWords[0].meaning}" (just a heuristic).
      
      Return ONLY a JSON array with this structure, no markdown, no extra text:
      [
        { "term": "word1", "ipa": "/ipa/", "pos": "noun" },
        ...
      ]
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");
      
      const data = JSON.parse(text) as { term: string; ipa: string; pos: string }[];
      
      // Merge AI data back into original words
      const enrichedWords = initialWords.map(w => {
        const found = data.find(d => d.term.toLowerCase() === w.term.toLowerCase());
        return {
          ...w,
          ipa: found?.ipa || '/.../',
          pos: found?.pos || ''
        };
      });

      return enrichedWords;

    } catch (err) {
      console.error("Dictionary lookup failed", err);
      setError("Không thể tra từ điển lúc này. Vui lòng thử lại.");
      return null;
    }
  };

  const handleStart = async () => {
    const { words, error: parseError } = parseVocabularyInput(input);
    if (parseError) {
      setError(parseError);
      return;
    }

    setIsLoading(true);
    setError(null);

    const finalWords = await enrichWordsWithOxfordData(words);
    
    setIsLoading(false);
    
    if (finalWords) {
      onStart(finalWords);
    }
  };

  if (isLoading) {
    return (
        <div className="w-full min-h-full px-4 py-8 flex flex-col items-center justify-center">
            <div className="glass-strong p-10 rounded-3xl shadow-2xl flex flex-col items-center max-w-md text-center animate-fade-in-up m-auto">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                     <span className="text-2xl">📚</span>
                  </div>
                </div>
                <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 mb-2">Đang tra từ điển...</h2>
                <p className="text-slate-600 dark:text-slate-300">
                    AI đang kết nối với Oxford Dictionary để lấy IPA & POS chuẩn cho bạn.
                </p>
            </div>
        </div>
    );
  }

  return (
    // Min-h-full ensures it takes at least full screen height. 
    // Flex items-center (cross-axis) centers content horizontally.
    // We use my-auto on the child to handle vertical centering when content is small, 
    // but default flow allows scrolling when content is large.
    <div className="w-full min-h-full flex flex-col items-center p-4 pb-24 md:pb-12">
      <div className="max-w-5xl w-full glass rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 hover:shadow-indigo-500/20 animate-fade-in my-auto">
        
        {/* Colorful Header */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 md:p-10 relative overflow-hidden group">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-400 opacity-10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
            
            <h1 className="text-3xl md:text-5xl font-black text-white mb-3 relative z-10 drop-shadow-lg">
                Start Your Journey
            </h1>
            <p className="text-indigo-100 text-lg md:text-xl relative z-10 font-medium max-w-2xl">
                Nhập danh sách từ vựng và để AI biến chúng thành bài học tương tác.
            </p>
            
            <div className="mt-6 inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-inner">
                 <span className="bg-indigo-500/50 p-1 rounded text-xs font-bold uppercase tracking-wider">Format</span>
                 <span className="font-mono text-yellow-300 font-bold tracking-wide break-all">English : Vietnamese</span>
            </div>
        </div>

        <div className="p-6 md:p-10 bg-white/50 dark:bg-slate-900/50">
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-2xl opacity-30 group-hover:opacity-70 blur transition duration-500"></div>
                {/* Responsive height: h-64 on mobile, h-[350px] on larger screens */}
                <textarea
                  className="relative w-full h-64 md:h-[350px] bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-6 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-transparent focus:ring-0 outline-none font-mono text-base md:text-lg leading-loose shadow-inner resize-none transition-colors duration-300 z-10"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="hello : xin chào&#10;world : thế giới"
                  spellCheck={false}
                />
            </div>

            {error && (
            <div className="mt-6 p-4 bg-red-100/80 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 rounded-xl flex items-center shadow-sm animate-shake backdrop-blur">
                <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span className="font-semibold">{error}</span>
            </div>
            )}

            <button
                onClick={handleStart}
                className="mt-8 w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xl font-bold rounded-2xl shadow-xl shadow-indigo-500/30 transition-all transform hover:-translate-y-1 hover:shadow-2xl flex items-center justify-center gap-3 group relative overflow-hidden"
            >
                <span className="absolute w-full h-full bg-white opacity-10 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out skew-x-12"></span>
                <span className="relative flex items-center gap-2">
                    Analyze & Learn
                    <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                </span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default ImportScreen;