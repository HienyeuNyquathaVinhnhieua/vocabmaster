import { Word } from '../types';

// Helper to shuffle array (Fisher-Yates)
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const parseVocabularyInput = (text: string): { words: Word[]; error: string | null } => {
  const lines = text.split('\n');
  const words: Word[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const parts = line.split(':');
    if (parts.length < 2) {
      return { words: [], error: `Dòng ${i + 1} sai định dạng. Thiếu dấu hai chấm (:).` };
    }

    const term = parts[0].trim();
    const meaning = parts.slice(1).join(':').trim(); // Re-join if meaning contains colons

    if (!term || !meaning) {
      return { words: [], error: `Dòng ${i + 1} thiếu từ hoặc nghĩa.` };
    }

    words.push({
      id: i + 1, // Simple ID generation
      term,
      meaning,
      ipa: '', // Will be filled by AI
      pos: ''  // Will be filled by AI
    });
  }

  if (words.length === 0) {
    return { words: [], error: "Vui lòng nhập ít nhất một từ vựng." };
  }

  return { words, error: null };
};

// Simple audio feedback (Sound Effects)
export const playAudio = (type: 'correct' | 'wrong') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'correct') {
      // High pitched ding
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else {
      // Low buzz
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.00001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

// Text-to-Speech function (British English preferred)
export const speakText = (text: string) => {
  if (!('speechSynthesis' in window)) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Priority: en-GB (British English) to match Oxford IPA
  utterance.lang = 'en-GB';
  utterance.rate = 0.85; // Slightly slower for clarity

  // Try to force a specific GB voice if available (Chrome/Edge/Safari often have specific high-quality ones)
  const voices = window.speechSynthesis.getVoices();
  const britishVoice = voices.find(v => 
    v.lang === 'en-GB' || 
    (v.lang.includes('GB') && v.name.includes('Google')) ||
    (v.lang.includes('UK') && v.name.includes('Siri'))
  );

  if (britishVoice) {
    utterance.voice = britishVoice;
  }

  window.speechSynthesis.speak(utterance);
};