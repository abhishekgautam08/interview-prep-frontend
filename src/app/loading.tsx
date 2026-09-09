import { RotateCw, Sparkles } from 'lucide-react';

export default function RootLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-brand-900 animate-pulse" />
        <div className="absolute inset-0 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        <Sparkles className="w-5 h-5 text-brand-400 absolute inset-0 m-auto animate-pulse" />
      </div>
      <p className="text-xs font-mono text-slate-400">Loading PrepKit AI...</p>
    </div>
  );
}
