import React, { useState, useEffect } from 'react';
import { Word, Stage, QuizStats } from './types';
import ImportScreen from './components/ImportScreen';
import MultipleChoice from './components/MultipleChoice';
import TypingQuiz from './components/TypingQuiz';
import SummaryScreen from './components/SummaryScreen';
import { useSpacedRepetition } from './hooks/useSpacedRepetition';

// Configurable setting for mastery
const MASTERY_THRESHOLD = 100; 

const App: React.FC = () => {
  const [words, setWords] = useState<Word[]>([]);
  const [stage, setStage] = useState<Stage>(Stage.IMPORT);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // We need specific state snapshots for summaries
  const [stageAStats, setStageAStats] = useState<QuizStats | null>(null);
  const [stageBStats, setStageBStats] = useState<QuizStats | null>(null);

  // Initialize theme from local storage or preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        setIsDarkMode(false);
    } else {
        setIsDarkMode(true);
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const handleStart = (parsedWords: Word[]) => {
    setWords(parsedWords);
    setStage(Stage.STAGE_A);
  };

  const handleRestart = () => {
    setWords([]);
    setStage(Stage.IMPORT);
    setStageAStats(null);
    setStageBStats(null);
  };

  const getPercentage = (stats: QuizStats | null) => {
    if (!stats || stats.totalAttempts === 0) return 0;
    return Math.round((stats.correct / stats.totalAttempts) * 100);
  };

  return (
    <div className={isDarkMode ? 'dark' : ''}>
        {/* Use 100dvh to handle mobile browser bars correctly */}
        <div className="relative h-[100dvh] w-full overflow-hidden bg-slate-50 dark:bg-darkBg text-slate-900 dark:text-white font-sans transition-colors duration-500 flex flex-col">
            
            {/* --- ANIMATED BACKGROUND BLOBS --- */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                {/* Blob 1 - Blue/Purple */}
                <div className="absolute top-0 -left-4 w-72 h-72 md:w-96 md:h-96 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob"></div>
                {/* Blob 2 - Pink/Red */}
                <div className="absolute top-0 -right-4 w-72 h-72 md:w-96 md:h-96 bg-yellow-300 dark:bg-pink-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
                {/* Blob 3 - Indigo/Teal */}
                <div className="absolute -bottom-8 left-20 w-72 h-72 md:w-96 md:h-96 bg-pink-300 dark:bg-indigo-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
                
                {/* Grid Pattern Overlay */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            </div>

            {/* --- GLASS HEADER --- */}
            <header className="relative z-50 shrink-0 p-4 border-b border-white/20 dark:border-white/5 bg-white/40 dark:bg-black/20 backdrop-blur-lg shadow-sm">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3 group cursor-default">
                        <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform duration-300">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                        </div>
                        <span className="font-extrabold text-xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 tracking-tight">
                            VocabMaster
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={toggleTheme}
                            className="p-2 rounded-full bg-white/50 dark:bg-black/40 hover:bg-white/80 dark:hover:bg-black/60 backdrop-blur transition-all border border-white/20 text-slate-700 dark:text-yellow-400 shadow-sm"
                        >
                            {isDarkMode ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                            ) : (
                                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                            )}
                        </button>

                        {stage !== Stage.IMPORT && (
                            <button 
                                onClick={handleRestart} 
                                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-black/30 rounded-lg hover:bg-red-500 hover:text-white transition-all border border-transparent hover:border-red-400 backdrop-blur"
                            >
                                Exit
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* --- MAIN CONTENT --- */}
            <main className="relative z-10 flex-grow w-full overflow-hidden">
                {stage === Stage.IMPORT && (
                    <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                        <ImportScreen onStart={handleStart} />
                    </div>
                )}

                {stage === Stage.STAGE_A && (
                    <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                        <div className="min-h-full flex flex-col pb-20">
                            <QuizWrapper 
                                key="stage-a" 
                                mode="A" 
                                words={words} 
                                onFinish={(stats) => {
                                    setStageAStats(stats);
                                    setStage(Stage.SUMMARY_A);
                                }} 
                            />
                        </div>
                    </div>
                )}

                {stage === Stage.SUMMARY_A && stageAStats && (
                    <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                        {(() => {
                            const pct = getPercentage(stageAStats);
                            const passed = pct >= MASTERY_THRESHOLD;
                            return (
                            <SummaryScreen 
                                title={passed ? "Hoàn thành Giai đoạn 1" : `Chưa đạt ${MASTERY_THRESHOLD}%`}
                                stats={stageAStats}
                                allWords={words}
                                btnText={passed ? "Tiếp tục sang Giai đoạn 2" : "Làm lại Giai đoạn 1"}
                                onContinue={() => {
                                if (passed) {
                                    setStage(Stage.STAGE_B);
                                } else {
                                    setStage(Stage.STAGE_A);
                                }
                                }}
                            />
                            );
                        })()}
                    </div>
                )}

                {stage === Stage.STAGE_B && (
                    <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                        <div className="min-h-full flex flex-col pb-20">
                            <QuizWrapper 
                            key="stage-b"
                            mode="B" 
                            words={words} 
                            onFinish={(stats) => {
                                setStageBStats(stats);
                                setStage(Stage.FINAL_SUMMARY);
                            }} 
                            />
                        </div>
                    </div>
                )}

                {stage === Stage.FINAL_SUMMARY && stageBStats && (
                    <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                        <SummaryScreen 
                            title="🎉 Chúc mừng! Bạn đã hoàn thành."
                            stats={stageBStats}
                            allWords={words}
                            btnText="Học lại bộ từ này"
                            onContinue={handleRestart}
                        />
                    </div>
                )}
            </main>
        </div>
    </div>
  );
};

const QuizWrapper: React.FC<{ 
    mode: 'A' | 'B', 
    words: Word[], 
    onFinish: (stats: QuizStats) => void 
}> = ({ mode, words, onFinish }) => {
    const { currentWord, isFinished, handleResult, pickNextWord, stats, progress } = useSpacedRepetition({
        allWords: words,
        mode
    });

    React.useEffect(() => {
        if (isFinished) {
            onFinish(stats);
        }
    }, [isFinished, onFinish, stats]);

    if (!currentWord) return (
        <div className="h-full flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-indigo-400 animate-pulse font-medium">Loading SRS Queue...</p>
        </div>
    );

    if (mode === 'A') {
        return (
            <MultipleChoice 
                word={currentWord} 
                allWords={words} 
                onAnswer={handleResult} 
                onNext={pickNextWord}
                progress={{
                    current: progress.mastered, 
                    total: words.length,
                    reviewCount: progress.review
                }}
            />
        );
    } else {
        return (
            <TypingQuiz 
                word={currentWord} 
                onAnswer={handleResult} 
                onNext={pickNextWord}
                progress={{ reviewCount: progress.review }}
            />
        );
    }
};

export default App;