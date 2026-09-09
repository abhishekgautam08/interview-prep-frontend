'use client';

import Link from 'next/link';
import { useAuth } from '../lib/auth';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <div className="relative pt-12 pb-16 text-center max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Turn Any Job Description Into a{' '}
          <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            Personalised Prep Kit
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Autonomous company crawling, deliberate requirement extraction, deterministic arithmetic
          scheduling, interactive flashcards, and live AI mock interview feedback.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href={user ? '/dashboard' : '/register'}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-lg shadow-brand-600/30 transition-all hover:scale-105"
          >
            {user ? 'Go to Dashboard' : 'Get Started Free'}
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/login"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold transition-all"
          >
            Sign In
          </Link>
        </div>

        {/* Mandatory Batch Evaluation CLI Snippet */}
        <div className="pt-8 max-w-xl mx-auto">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl text-left font-mono backdrop-blur-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-sans font-semibold text-slate-300">Mandatory Batch Evaluation CLI</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-brand-950 text-brand-400 border border-brand-800/80 text-[10px] font-sans font-medium">
                Section 9 Entry Point
              </span>
            </div>
            <div className="pt-3.5 text-xs text-slate-200 overflow-x-auto whitespace-nowrap">
              <span className="text-emerald-400 select-none">$ </span>
              <span className="text-brand-300">npm run evaluate</span>{' '}
              <span className="text-slate-400">--</span>{' '}
              <span className="text-indigo-300">--input</span> test-cases.json{' '}
              <span className="text-indigo-300">--output</span> test-output.json
            </div>
            <div className="mt-2 text-[11px] text-slate-500 font-sans">
              Autonomous pipeline evaluation matching Appendix B schema.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
