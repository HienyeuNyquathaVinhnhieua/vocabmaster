import { useState, useCallback, useEffect } from 'react';
import { Word, SRSQueueItem, QuizStats, WordStatus } from '../types';
import { shuffleArray } from '../utils/helpers';

interface UseSRSProps {
  allWords: Word[];
  mode: 'A' | 'B'; // A = Multiple Choice, B = Typing
}

export const useSpacedRepetition = ({ allWords, mode }: UseSRSProps) => {
  // Queue of IDs that haven't been seen yet in this session
  const [newWordsQueue, setNewWordsQueue] = useState<number[]>([]);
  
  // Queue of words that were wrong and need review { id, cooldown }
  const [reviewQueue, setReviewQueue] = useState<SRSQueueItem[]>([]);
  
  // The current word being tested
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  
  // Stats for the session
  const [stats, setStats] = useState<QuizStats>({
    correct: 0,
    incorrect: 0,
    totalAttempts: 0,
    incorrectWords: []
  });

  // Tracking status of each word
  const [wordStatuses, setWordStatuses] = useState<Record<number, WordStatus>>({});

  // Flag to indicate if the session is completely finished
  const [isFinished, setIsFinished] = useState(false);

  // Initialization
  useEffect(() => {
    const shuffledIds = shuffleArray(allWords.map(w => w.id));
    setNewWordsQueue(shuffledIds);
    
    const initialStatuses: Record<number, WordStatus> = {};
    allWords.forEach(w => initialStatuses[w.id] = 'new');
    setWordStatuses(initialStatuses);
  }, [allWords]);

  const pickNextWord = useCallback(() => {
    setReviewQueue(prevQueue => {
        // 1. Decrement cooldown
        let nextQueue = prevQueue.map(item => ({
            ...item,
            cooldown: item.cooldown - 1
        }));

        // 2. Determine next word ID
        let nextId: number | undefined;

        // Priority A: Review items with cooldown <= 0 (Ready to review)
        const readyReviewIndex = nextQueue.findIndex(item => item.cooldown <= 0);

        if (readyReviewIndex !== -1) {
            nextId = nextQueue[readyReviewIndex].wordId;
            // Remove from queue
            nextQueue.splice(readyReviewIndex, 1);
        } 
        // Priority B: New words (if no reviews are ready)
        else if (newWordsQueue.length > 0) {
            nextId = newWordsQueue[0];
            setNewWordsQueue(prev => prev.slice(1));
        } 
        // Priority C: Force review if no new words left (even if cooldown > 0)
        // This ensures we finish the review queue at the end
        else if (nextQueue.length > 0) {
            // Sort by lowest cooldown to pick the one closest to being ready
            nextQueue.sort((a, b) => a.cooldown - b.cooldown);
            nextId = nextQueue[0].wordId;
            nextQueue.shift();
        }

        if (nextId !== undefined) {
            const wordObj = allWords.find(w => w.id === nextId);
            if (wordObj) setCurrentWord(wordObj);
        } else {
            // Nothing left anywhere
            setIsFinished(true);
            setCurrentWord(null);
        }

        return nextQueue;
    });
  }, [allWords, newWordsQueue]); // reviewQueue is handled functionally

  // Start the quiz if currentWord is null and not finished
  useEffect(() => {
    if (!currentWord && !isFinished && newWordsQueue.length > 0) {
        pickNextWord();
    }
  }, [currentWord, isFinished, newWordsQueue.length, pickNextWord]);


  const handleResult = (isCorrect: boolean) => {
    if (!currentWord) return;

    setStats(prev => {
      const newStats = { ...prev, totalAttempts: prev.totalAttempts + 1 };
      if (isCorrect) {
        newStats.correct = prev.correct + 1;
      } else {
        newStats.incorrect = prev.incorrect + 1;
        if (!newStats.incorrectWords.includes(currentWord.id)) {
          newStats.incorrectWords = [...newStats.incorrectWords, currentWord.id];
        }
      }
      return newStats;
    });

    if (isCorrect) {
      setWordStatuses(prev => ({
        ...prev,
        [currentWord.id]: 'mastered'
      }));
    } else {
      setWordStatuses(prev => ({
        ...prev,
        [currentWord.id]: 'review'
      }));
      
      // Incorrect -> Add to review queue with cooldown 3
      setReviewQueue(prev => {
        // Prevent duplicates
        if (prev.some(i => i.wordId === currentWord.id)) return prev;
        return [...prev, { wordId: currentWord.id, cooldown: 3 }];
      });
    }
  };

  return {
    currentWord,
    isFinished,
    pickNextWord,
    handleResult,
    stats,
    progress: {
        total: allWords.length,
        learning: newWordsQueue.length,
        // Use wordStatuses for a more stable "Reviewing" count displayed to user.
        // This counts words that are currently in the 'review' state (incorrect but not yet mastered)
        review: Object.values(wordStatuses).filter(s => s === 'review').length,
        mastered: Object.values(wordStatuses).filter(s => s === 'mastered').length
    }
  };
};