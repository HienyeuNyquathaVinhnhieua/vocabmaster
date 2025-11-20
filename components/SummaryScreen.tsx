import React from 'react';
import { QuizStats, Word } from '../types';

interface SummaryScreenProps {
  title: string;
  stats: QuizStats;
  allWords: Word[];
  onContinue: () => void;
  btnText: string;
}

const SummaryScreen: React.FC<SummaryScreenProps> = ({ title, stats, allWords, onContinue, btnText }) => {
  const percentage = stats.totalAttempts > 0 
    ? Math.round((stats.correct / stats.totalAttempts) * 100) 
    : 0;

  const incorrectWordsDetails = allWords.filter(w => stats.incorrectWords.includes(w.id));
  
  const strokeDasharray = 2 * Math.PI * 45; 
  const strokeDashoffset = strokeDasharray * ((100 - percentage) / 100);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-4 animate-fade-in overflow-hidden">
      <div className="w-full max-w-4xl h-full max-h-[90vh] glass-strong rounded-[2.5rem] shadow-2xl transition-colors duration-300 flex flex-col relative overflow-hidden border border-white/30 dark:border-white/10">
        
        {/* Header */}
        <div className="shrink-0 pt-6 text-center px-6 z-10">
            <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 mb-1">{title}</h2>
            <div className="h-1 w-24 mx-auto bg-gradient-to-r from-transparent via-indigo-500 to-transparent rounded-full opacity-50"></div>
        </div>

        {/* Circle Chart */}
        <div className="flex-grow flex flex-col items-center justify-center py-4 min-h-0 relative z-10">
            <div className="relative flex items-center justify-center animate-bounce-slight" style={{ height: '40vh', width: '40vh', maxHeight: '400px', maxWidth: '400px' }}>
                {/* Glow behind circle */}
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-3xl"></div>
                
                <svg className="w-full h-full transform -rotate-90 drop-shadow-2xl" viewBox="0 0 100 100">
                    <circle
                        cx="50" cy="50" r="45"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="6"
                        className="text-slate-200 dark:text-slate-700/50"
                    />
                    <circle
                        cx="50" cy="50" r="45"
                        fill="transparent"
                        stroke="url(#gradient)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                    />
                    <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                    </defs>
                </svg>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-[12vh] md:text-[10rem] font-black text-slate-800 dark:text-white leading-none tracking-tighter drop-shadow-sm" style={{ fontSize: 'min(18vw, 12vh)' }}>
                        {percentage}<span className="text-[4vh] align-top text-indigo-500 opacity-80">%</span>
                    </div>
                    <div className="text-sm md:text-lg text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.2em]">Accuracy</div>
                </div>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="shrink-0 px-8 pb-4 z-10">
             <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto">
                <div className="glass p-4 rounded-2xl flex flex-col items-center border-b-4 border-b-green-500 shadow-lg hover:-translate-y-1 transition-transform">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide mb-1">Correct</div>
                    <div className="text-3xl font-black text-green-500">{stats.correct}</div>
                </div>
                <div className="glass p-4 rounded-2xl flex flex-col items-center border-b-4 border-b-red-500 shadow-lg hover:-translate-y-1 transition-transform">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide mb-1">Review</div>
                    <div className="text-3xl font-black text-red-500">{stats.incorrectWords.length}</div>
                </div>
            </div>
        </div>

        {/* Incorrect Words List */}
        <div className="flex-shrink flex-grow-0 min-h-0 px-8 my-2 w-full z-10 flex flex-col items-center">
             {incorrectWordsDetails.length > 0 && (
                <div className="w-full max-w-lg flex flex-col h-full max-h-[15vh]">
                    <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-2 flex items-center justify-center">
                         Needs Practice
                    </h3>
                    <div className="overflow-y-auto pr-2 space-y-2 custom-scrollbar bg-white/40 dark:bg-black/20 p-2 rounded-xl border border-white/20">
                        {incorrectWordsDetails.map(w => (
                            <div key={w.id} className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border-l-4 border-orange-400">
                                <span className="font-bold text-slate-800 dark:text-white">{w.term}</span>
                                <span className="text-slate-500 dark:text-gray-400 text-sm">{w.meaning}</span>
                            </div>
                        ))}
                    </div>
                </div>
             )}
        </div>

        {/* Footer Button */}
        <div className="shrink-0 p-6 bg-white/60 dark:bg-black/40 border-t border-white/20 backdrop-blur z-20 mt-2">
            <button
                onClick={onContinue}
                className="w-full max-w-md mx-auto block py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xl font-bold rounded-2xl shadow-xl shadow-indigo-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] tracking-wide"
            >
                {btnText}
            </button>
        </div>

      </div>
    </div>
  );
};

export default SummaryScreen;