import { Sparkles, RotateCw, Layers, Calendar, CheckCircle2 } from 'lucide-react';

export default function KitLoading() {
  return (
    <div className="space-y-6 pb-16 animate-pulse">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700/50" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-48 sm:w-64 bg-slate-800 rounded-lg" />
              <div className="h-5 w-20 bg-brand-950/80 border border-brand-900 rounded-full" />
            </div>
            <div className="h-4 w-40 bg-slate-800/60 rounded" />
          </div>
        </div>

        <div className="h-10 w-44 bg-slate-800 rounded-xl" />
      </div>

      {/* Floating Status Pill */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-brand-950/80 border border-brand-500/40 text-brand-300 shadow-xl backdrop-blur-md">
          <RotateCw className="w-4 h-4 text-brand-400 animate-spin" />
          <span className="text-xs font-semibold text-white">
            Assembling your tailored interview kit...
          </span>
        </div>
      </div>

      {/* 4 Metric Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="h-3 w-24 bg-slate-800 rounded" />
            <div className="h-8 w-16 bg-slate-800/80 rounded" />
            <div className="h-3 w-32 bg-slate-800/50 rounded" />
          </div>
        ))}
      </div>

      {/* Navigation Tabs Bar Skeleton */}
      <div className="flex gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <div className="h-10 w-36 bg-slate-800 rounded-xl" />
        <div className="h-10 w-36 bg-slate-850/60 rounded-xl" />
        <div className="h-10 w-36 bg-slate-850/60 rounded-xl" />
        <div className="h-10 w-36 bg-slate-850/60 rounded-xl" />
      </div>

      {/* Filter Pills Skeleton */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <div className="h-8 w-20 bg-slate-800 rounded-xl" />
        <div className="h-8 w-28 bg-slate-850/60 rounded-xl" />
        <div className="h-8 w-32 bg-slate-850/60 rounded-xl" />
        <div className="h-8 w-32 bg-slate-850/60 rounded-xl" />
      </div>

      {/* Question Cards Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-5 w-12 bg-slate-800 rounded" />
                <div className="h-5 w-24 bg-slate-800/60 rounded-full" />
                <div className="h-5 w-20 bg-slate-800/40 rounded-full" />
              </div>
              <div className="flex gap-2">
                <div className="w-7 h-7 bg-slate-800 rounded-lg" />
                <div className="w-7 h-7 bg-slate-800 rounded-lg" />
              </div>
            </div>
            <div className="h-5 w-4/5 bg-slate-800 rounded" />
            <div className="h-20 w-full bg-slate-950/60 border border-slate-800/50 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
