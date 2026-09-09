'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../lib/auth';
import { apiGetKit, apiUpdateCardConfidence, apiMockEvaluate } from '../../../../lib/api';
import { Kit, KitRecord, Flashcard, Question, MockEvaluationResult } from '../../../../types';
import {
  ArrowLeft,
  RotateCw,
  Sparkles,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Brain,
  MessageSquare,
  ThumbsUp,
  TrendingUp,
  Layers,
  Send,
  Loader2,
} from 'lucide-react';

export default function PracticeModePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const id = params.id as string;

  const [kit, setKit] = useState<Kit | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem(`prepkit_kit_${id}`);
        if (cached) return JSON.parse(cached).kit;
      } catch (e) {}
    }
    return null;
  });
  const [cards, setCards] = useState<Flashcard[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem(`prepkit_kit_${id}`);
        if (cached) {
          const k = JSON.parse(cached).kit;
          return [...k.flashcards].sort((a, b) => {
            const confA = a._provenance?.confidence ?? 0;
            const confB = b._provenance?.confidence ?? 0;
            const scoreA = confA === 0 ? 0.5 : confA;
            const scoreB = confB === 0 ? 0.5 : confB;
            return scoreA - scoreB;
          });
        }
      } catch (e) {}
    }
    return [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem(`prepkit_kit_${id}`);
        if (cached) return false;
      } catch (e) {}
    }
    return true;
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Creative Feature: Mock Interviewer State
  const [showMockModal, setShowMockModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [evaluatingAnswer, setEvaluatingAnswer] = useState(false);
  const [mockFeedback, setMockFeedback] = useState<MockEvaluationResult | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && id) {
      loadDeck();
    }
  }, [user, authLoading, id]);

  const loadDeck = async () => {
    if (!kit) {
      setLoading(true);
    }
    try {
      const data = await apiGetKit(id);
      setKit(data.kit);

      // Section 7 Requirement: Order session by what they were least confident about
      // Sort logic: Confidence 0 (unreviewed) and 1 (needs practice) first, 2 (neutral), 3 (mastered) last
      const sortedCards = [...data.kit.flashcards].sort((a, b) => {
        const confA = a._provenance?.confidence ?? 0;
        const confB = b._provenance?.confidence ?? 0;
        // If one is unreviewed (0), prioritize it or order by confidence ascending
        const scoreA = confA === 0 ? 0.5 : confA;
        const scoreB = confB === 0 ? 0.5 : confB;
        return scoreA - scoreB;
      });

      setCards(sortedCards);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(`prepkit_kit_${id}`, JSON.stringify(data));
        } catch (e) {}
      }
    } catch (err: any) {
      console.error('Failed to load practice deck:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRateConfidence = async (level: 1 | 2 | 3) => {
    if (cards.length === 0) return;
    const currentCard = cards[currentIndex];

    // Optimistically update card confidence
    const updatedCards = [...cards];
    updatedCards[currentIndex] = {
      ...currentCard,
      _provenance: {
        ...currentCard._provenance,
        origin: currentCard._provenance?.origin || 'generated',
        confidence: level,
        lastReviewedAt: new Date().toISOString(),
      },
    };
    setCards(updatedCards);

    // Call backend API to record confidence
    apiUpdateCardConfidence(id, currentCard.id, level).catch(console.error);

    // Move to next card or complete session
    setIsFlipped(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setSessionCompleted(true);
    }
  };

  // Keyboard navigation shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (showMockModal) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.key === '1') {
        e.preventDefault();
        handleRateConfidence(1);
      } else if (e.key === '2') {
        e.preventDefault();
        handleRateConfidence(2);
      } else if (e.key === '3') {
        e.preventDefault();
        handleRateConfidence(3);
      } else if (e.key === 'ArrowRight' && currentIndex < cards.length - 1) {
        setIsFlipped(false);
        setCurrentIndex(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setIsFlipped(false);
        setCurrentIndex(prev => prev - 1);
      }
    },
    [currentIndex, cards, showMockModal]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // AI Mock Interviewer Answer Submission
  const handleEvaluateAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestion || !userAnswer.trim()) return;

    setEvaluatingAnswer(true);
    setMockFeedback(null);

    try {
      const res = await apiMockEvaluate(id, selectedQuestion.id, userAnswer);
      setMockFeedback(res.feedback);
    } catch (err: any) {
      alert(`Mock evaluation error: ${err.message}`);
    } finally {
      setEvaluatingAnswer(false);
    }
  };

  if (loading || !kit) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-16 animate-pulse">
        {/* Top Header Skeleton */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="h-5 w-36 bg-slate-800 rounded" />
          <div className="h-8 w-40 bg-purple-950/60 border border-purple-900 rounded-xl" />
        </div>

        {/* Progress Bar Skeleton */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-4 w-52 bg-slate-800 rounded" />
            <div className="h-4 w-24 bg-slate-800 rounded" />
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full" />
        </div>

        {/* Flashcard Skeleton */}
        <div className="min-h-[320px] sm:min-h-[360px] w-full rounded-3xl bg-slate-900/80 border border-slate-800 p-8 flex flex-col justify-between shadow-2xl">
          <div className="flex justify-between">
            <div className="h-4 w-28 bg-slate-800 rounded" />
            <div className="h-5 w-24 bg-slate-800 rounded-full" />
          </div>

          <div className="my-auto text-center space-y-3">
            <div className="h-3 w-32 bg-slate-800 rounded mx-auto" />
            <div className="h-8 w-3/4 bg-slate-800/80 rounded mx-auto" />
          </div>

          <div className="flex justify-between">
            <div className="h-3 w-32 bg-slate-800 rounded" />
            <div className="h-3 w-28 bg-slate-800 rounded" />
          </div>
        </div>

        {/* Floating Status Pill */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-brand-950/80 border border-brand-500/40 text-brand-300 shadow-xl backdrop-blur-md">
            <RotateCw className="w-4 h-4 text-brand-400 animate-spin" />
            <span className="text-xs font-semibold text-white">
              Loading 3D Spaced Repetition Deck...
            </span>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const reviewedCount = cards.filter(c => (c._provenance?.confidence ?? 0) > 0).length;
  const masteredCount = cards.filter(c => c._provenance?.confidence === 3).length;
  const needsPracticeCount = cards.filter(c => c._provenance?.confidence === 1).length;
  const progressPercent = cards.length === 0 ? 100 : Math.round((reviewedCount / cards.length) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <Link
          href={`/kits/${id}`}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Kit Builder
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (kit.questions.length > 0) {
                setSelectedQuestion(kit.questions[0]);
                setShowMockModal(true);
              }
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-950/80 border border-purple-800 hover:bg-purple-900 text-purple-300 text-xs font-semibold transition-all shadow-sm"
          >
            <Brain className="w-3.5 h-3.5" />
            AI Mock Interviewer
          </button>
        </div>
      </div>

      {/* Spaced Repetition Stats Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-slate-400">
            <span className="text-white font-bold">
              Card {currentIndex + 1} of {cards.length}
            </span>
            <span>&bull;</span>
            <span className="text-emerald-400">{masteredCount} Mastered</span>
            <span>&bull;</span>
            <span className="text-rose-400">{needsPracticeCount} Needs Practice</span>
          </div>
          <span className="text-brand-400 font-mono">{progressPercent}% Covered</span>
        </div>

        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-brand-600 via-indigo-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* MAIN PRACTICE FLASHCARD VIEW */}
      {!sessionCompleted && currentCard ? (
        <div className="space-y-6">
          {/* 3D Flip Card Container */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="perspective-1000 min-h-[320px] sm:min-h-[360px] w-full cursor-pointer select-none"
          >
            <div
              className={`relative w-full min-h-[320px] sm:min-h-[360px] rounded-3xl transition-transform duration-500 transform-style-3d border shadow-2xl ${
                isFlipped
                  ? 'rotate-y-180 bg-slate-900 border-brand-500/50 shadow-brand-950/50'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-black/40'
              }`}
            >
              {/* FRONT OF CARD */}
              <div className="absolute inset-0 backface-hidden p-5 sm:p-8 md:p-12 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono font-bold uppercase tracking-wider text-brand-400">
                    {currentCard.id} &bull; Front
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                    Click or Space to flip
                  </span>
                </div>

                <div className="my-auto text-center space-y-4">
                  <span className="text-xs uppercase font-bold text-slate-500 tracking-widest block">
                    Core Technical Concept
                  </span>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-snug">
                    {currentCard.front}
                  </h2>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Requirement: {currentCard.requirement_ids.join(', ')}</span>
                  <span>Confidence: {currentCard._provenance?.confidence || 'Unreviewed'}</span>
                </div>
              </div>

              {/* BACK OF CARD (REVEALED) */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 p-5 sm:p-8 md:p-12 flex flex-col justify-between bg-slate-900 rounded-3xl overflow-y-auto">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono font-bold uppercase tracking-wider text-emerald-400">
                    {currentCard.id} &bull; Model Answer & Outline
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                    Revealed
                  </span>
                </div>

                <div className="my-auto space-y-4">
                  <p className="text-sm sm:text-base md:text-lg text-slate-200 leading-relaxed font-normal">
                    {currentCard.back}
                  </p>
                </div>

                <div className="text-xs text-slate-500 text-center">
                  Press [1], [2], or [3] to record confidence
                </div>
              </div>
            </div>
          </div>

          {/* Confidence Rating Buttons (Section 7) */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400 text-center sm:text-left">
              <span className="font-semibold text-white block">How confident do you feel?</span>
              This dynamically orders your next session by least confident cards first.
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleRateConfidence(1)}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-rose-950/70 border border-rose-800 hover:bg-rose-900 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:scale-105"
                title="Shortcut: 1"
              >
                <span>[1]</span> Needs Practice
              </button>

              <button
                onClick={() => handleRateConfidence(2)}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:scale-105"
                title="Shortcut: 2"
              >
                <span>[2]</span> Neutral
              </button>

              <button
                onClick={() => handleRateConfidence(3)}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-950/70 border border-emerald-800 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:scale-105"
                title="Shortcut: 3"
              >
                <span>[3]</span> Mastered
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* SESSION COMPLETE VIEW */
        <div className="text-center py-16 px-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 mx-auto">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Flashcard Session Complete!</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              You reviewed all {cards.length} cards. Your spaced repetition schedule has been updated to prioritize items needing practice.
            </p>
          </div>

          <div className="grid grid-cols-3 max-w-sm mx-auto gap-3 py-4">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <span className="block text-lg font-bold text-emerald-400">{masteredCount}</span>
              <span className="text-[10px] text-slate-400 uppercase">Mastered</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <span className="block text-lg font-bold text-slate-300">{cards.length - masteredCount - needsPracticeCount}</span>
              <span className="text-[10px] text-slate-400 uppercase">Neutral</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <span className="block text-lg font-bold text-rose-400">{needsPracticeCount}</span>
              <span className="text-[10px] text-slate-400 uppercase">Practice</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => {
                setSessionCompleted(false);
                setCurrentIndex(0);
                loadDeck();
              }}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md transition-all"
            >
              Start Next Session (Weakest First)
            </button>

            <Link
              href={`/kits/${id}`}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
            >
              Return to Kit Builder
            </Link>
          </div>
        </div>
      )}

      {/* CREATIVE FEATURE MODAL: AI MOCK INTERVIEWER (Section 14) */}
      {showMockModal && selectedQuestion && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">AI Mock Interview Rehearsal</h3>
                  <p className="text-xs text-slate-400">Instant rubric evaluation & depth diagnostics</p>
                </div>
              </div>
              <button onClick={() => setShowMockModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {/* Question Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Select Interview Question
              </label>
              <select
                value={selectedQuestion.id}
                onChange={e => {
                  const q = kit.questions.find(item => item.id === e.target.value);
                  if (q) {
                    setSelectedQuestion(q);
                    setUserAnswer('');
                    setMockFeedback(null);
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              >
                {kit.questions.map(q => (
                  <option key={q.id} value={q.id}>
                    [{q.category.toUpperCase()}] {q.prompt}
                  </option>
                ))}
              </select>
            </div>

            {/* Prompt Callout */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-brand-400 uppercase tracking-wider">
                Question ({selectedQuestion.category} &bull; Difficulty {selectedQuestion.difficulty}/3)
              </span>
              <p className="text-sm font-semibold text-white">{selectedQuestion.prompt}</p>
            </div>

            {/* Answer Submission Form */}
            <form onSubmit={handleEvaluateAnswer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Your Answer (Type or transcribe your response)
                </label>
                <textarea
                  required
                  rows={5}
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  placeholder="Outline your approach, architectural trade-offs, edge cases, and concrete production examples..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={evaluatingAnswer || !userAnswer.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/30 transition-all disabled:opacity-50"
                >
                  {evaluatingAnswer ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Evaluating against rubric...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Evaluate Answer
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* AI Rubric Feedback */}
            {mockFeedback && (
              <div className="p-5 rounded-2xl bg-slate-950/90 border border-brand-500/40 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Score & Verdict</span>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <span className="text-brand-300">{mockFeedback.score} / 5</span>
                      <span>&bull;</span>
                      <span>{mockFeedback.verdict}</span>
                    </h4>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                    Suggested Confidence: Level {mockFeedback.suggestedConfidence}
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Strengths Demonstrated:
                  </span>
                  <ul className="list-disc list-inside text-xs text-slate-300 space-y-1 pl-1">
                    {mockFeedback.strengths.map((str, i) => (
                      <li key={i}>{str}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Missing Architectural Depth / Blindspots:
                  </span>
                  <ul className="list-disc list-inside text-xs text-slate-300 space-y-1 pl-1">
                    {mockFeedback.missedPoints.map((mp, i) => (
                      <li key={i}>{mp}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-purple-950/50 border border-purple-800/80 text-xs text-purple-200">
                  <strong className="text-purple-300">Actionable Tip:</strong> {mockFeedback.improvementTip}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
