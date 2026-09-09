import { RotateCw, Brain, Sparkles } from 'lucide-react';

export default function PracticeLoading() {
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
