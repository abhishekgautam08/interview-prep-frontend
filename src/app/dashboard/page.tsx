'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import { apiListKits, apiGenerateKit, apiDeleteKit } from '../../lib/api';
import { KitRecord } from '../../types';
import {
  Plus,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  Trash2,
  Upload,
  Sparkles,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  RefreshCw,
  RotateCw,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [kits, setKits] = useState<KitRecord[]>([]);
  const [loadingKits, setLoadingKits] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [jd, setJd] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState('');
  const [generationPercent, setGenerationPercent] = useState(0);

  // Batch Upload State
  const [batchJson, setBatchJson] = useState('');
  const [batchStatus, setBatchStatus] = useState<string | null>(null);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; percent: number; roleName?: string } | null>(null);
  const batchAbortRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadKits();
    }
  }, [user, authLoading]);

  const loadKits = async () => {
    setLoadingKits(true);
    try {
      const data = await apiListKits();
      setKits(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load kits');
    } finally {
      setLoadingKits(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jd.trim() || !companyUrl.trim()) return;

    setIsGenerating(true);
    setError(null);
    setGenerationPercent(15);
    setGenerationStage('Crawling company site & verifying requirements...');

    try {
      // Simulate progress stages while waiting for backend pipeline
      const interval = setInterval(() => {
        setGenerationPercent(prev => {
          if (prev >= 85) {
            clearInterval(interval);
            return 85;
          }
          if (prev === 15) setGenerationStage('Extracting structured must-have requirements...');
          else if (prev === 40) setGenerationStage('Synthesizing interview rounds & signals...');
          else if (prev === 60) setGenerationStage('Generating categorised question bank & flashcards...');
          else if (prev === 75) setGenerationStage('Deterministic coverage check & second-pass loop...');
          return prev + 15;
        });
      }, 1200);

      const res = await apiGenerateKit({ jd, company_url: companyUrl, days });
      clearInterval(interval);
      setGenerationPercent(100);
      setGenerationStage('✨ Generation Complete! Loading your personalized workspace...');

      // Cache kit in sessionStorage so /kits/[id] renders immediately with zero delay
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(`prepkit_kit_${res.id}`, JSON.stringify(res));
        } catch (e) {}
      }

      // Update local dashboard kits list
      setKits(prev => [res, ...prev.filter(k => k.id !== res.id)]);

      // Navigate smoothly while keeping transition feedback active
      router.push(`/kits/${res.id}`);

      // Safety cleanup in case user navigates back
      setTimeout(() => {
        setIsGenerating(false);
        setShowCreateModal(false);
      }, 3500);
    } catch (err: any) {
      setIsGenerating(false);
      setError(err.message || 'Generation failed. Please verify the URL and job description.');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this interview kit?')) return;

    try {
      await apiDeleteKit(id);
      setKits(prev => prev.filter(k => k.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete kit');
    }
  };

  const handleLoadSingleDemo = () => {
    setJd(
`Role: Senior Full-Stack Engineer
Company: Stripe
Location: Remote / San Francisco

About the Role:
Stripe builds economic infrastructure for the internet. As a Senior Full-Stack Engineer on our Core Payments & Billing team, you will design, implement, and scale high-throughput financial infrastructure and user-facing dashboards that power millions of global businesses.

Key Responsibilities:
• Architect, build, and maintain mission-critical APIs and web interfaces using TypeScript, React, and Node.js.
• Partner closely with product management and security architects to deliver reliable, sub-100ms payment workflows.
• Design resilient distributed architectures, asynchronous message processing (Kafka/RabbitMQ), and optimize database performance (PostgreSQL, Redis).
• Champion engineering excellence through disciplined code reviews, automated unit & integration testing, and production observability.

Requirements:
• 5+ years of software engineering experience building production-grade web applications.
• Deep proficiency in TypeScript, React, Node.js, and relational database schema design.
• Proven track record designing and maintaining distributed systems, caching layers, and high-availability REST/GraphQL microservices.
• Strong foundation in concurrency, idempotent transaction processing, and latency optimization.
• Excellent cross-functional communication skills, technical leadership, and empathy for developer UX.`
    );
    setCompanyUrl('https://stripe.com');
    setDays(5);
  };

  const handleLoadExampleBatch = () => {
    const exampleCases = [
      {
        id: 'case-01',
        jd: 'Role: Senior Full-Stack Engineer at Stripe\nRequirements: 5+ years experience across TypeScript, React, and Node.js. Experience designing distributed microservices, REST APIs, and caching layers with Redis. High-availability payment processing and database schema design skills required.',
        company_url: 'https://stripe.com',
        days: 5,
      },
      {
        id: 'case-02',
        jd: 'Role: Staff Backend Engineer at Airbnb\nRequirements: 8+ years building large-scale distributed systems. Proficiency in Go, Java, or Node.js. Deep expertise in event streaming with Kafka, asynchronous workflows, microservice scalability, and database resilience.',
        company_url: 'https://airbnb.com',
        days: 7,
      },
    ];
    setBatchJson(JSON.stringify(exampleCases, null, 2));
    setBatchStatus(null);
  };

  const handleBatchUpload = async () => {
    if (isBatchRunning) return;

    let parsed: any[];
    try {
      parsed = JSON.parse(batchJson);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Input must be a non-empty JSON array of role case objects.');
      }
    } catch (parseErr: any) {
      setBatchStatus(`Invalid JSON format: ${parseErr.message}`);
      return;
    }

    setIsBatchRunning(true);
    batchAbortRef.current = false;
    let completedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < parsed.length; i++) {
      if (batchAbortRef.current) {
        setBatchStatus(`Batch stopped by user. ${completedCount} kits generated.`);
        break;
      }

      const item = parsed[i];
      if (!item.jd || !item.company_url) {
        continue;
      }

      const roleName = item.company_url.replace(/^https?:\/\//, '').split('/')[0];
      setBatchProgress({
        current: i + 1,
        total: parsed.length,
        percent: Math.round((i / parsed.length) * 100),
        roleName,
      });
      setBatchStatus(`Generating kit ${i + 1} of ${parsed.length} (${roleName})...`);

      try {
        const res = await apiGenerateKit({
          jd: item.jd,
          company_url: item.company_url,
          days: item.days || 5,
        });

        completedCount++;
        // Add to dashboard in real-time
        setKits(prev => [res, ...prev.filter(k => k.id !== res.id)]);
      } catch (err: any) {
        failedCount++;
        console.error(`Batch item ${i + 1} error:`, err);
        setBatchStatus(`Notice: Role ${i + 1} (${roleName}) encountered: ${err.message}. Continuing...`);
        await new Promise(r => setTimeout(r, 800));
      }
    }

    setIsBatchRunning(false);
    setBatchProgress({
      current: parsed.length,
      total: parsed.length,
      percent: 100,
      roleName: 'Complete',
    });

    if (!batchAbortRef.current) {
      setBatchStatus(`Batch completed! Successfully created ${completedCount} kits${failedCount > 0 ? ` (${failedCount} skipped)` : ''}.`);
    }
  };

  const handleStopBatch = () => {
    batchAbortRef.current = true;
    setIsBatchRunning(false);
    setBatchStatus('Batch stopped by user.');
  };

  if (authLoading || (!user && loadingKits)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Interview Prep Kits
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Personalised study schedules, question banks, flashcards, and AI mock practice.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBatchModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sm font-medium text-slate-300 transition-colors"
          >
            <Upload className="w-4 h-4 text-brand-400" />
            Batch Upload
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-md shadow-brand-600/30 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            Create Kit
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs underline hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Kit Grid / Empty State */}
      {loadingKits ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-48 rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : kits.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-950 border border-brand-800 flex items-center justify-center text-brand-400 mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">No Interview Kits Yet</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Paste a job description and company URL to generate your first personalised interview preparation kit.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Your First Kit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kits.map(record => {
            const kit = record.kit;
            const mustCount = kit?.role?.requirements?.filter(r => r.priority === 'must').length || 0;
            const qCount = kit?.questions?.length || 0;
            const cardCount = kit?.flashcards?.length || 0;
            const daysCount = kit?.schedule?.days_available || 5;

            return (
              <Link
                key={record.id}
                href={`/kits/${record.id}`}
                className="group relative block p-6 rounded-2xl bg-slate-900/70 border border-slate-800/90 hover:border-brand-500/50 hover:bg-slate-900 transition-all hover:shadow-xl hover:shadow-brand-950/40"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {kit.source.company || 'Company'}
                  </span>
                  <button
                    onClick={e => handleDelete(record.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all"
                    title="Delete Kit"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-brand-300 transition-colors line-clamp-1">
                  {kit.role.title || record.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1 mb-4">
                  {kit.company_brief.summary || 'Custom tailored prep kit'}
                </p>

                <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800/80 text-center">
                  <div>
                    <span className="block text-base font-bold text-white">{qCount}</span>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Questions</span>
                  </div>
                  <div>
                    <span className="block text-base font-bold text-brand-300">{cardCount}</span>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Flashcards</span>
                  </div>
                  <div>
                    <span className="block text-base font-bold text-emerald-400">{daysCount}d</span>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Schedule</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {mustCount} Must-haves
                  </span>
                  <span className="flex items-center gap-1 text-slate-300 font-medium group-hover:translate-x-0.5 transition-transform">
                    Open Builder
                    <ArrowRight className="w-3.5 h-3.5 text-brand-400" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* CREATE KIT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Generate Interview Prep Kit</h3>
                  <p className="text-xs text-slate-400">Autonomous crawl, deliberate extraction & schedule</p>
                </div>
              </div>
              {!isGenerating && (
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              )}
            </div>

            {isGenerating ? (
              <div className="py-12 text-center space-y-6">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-brand-900 animate-pulse" />
                  <div className="absolute inset-0 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
                  <Sparkles className="w-6 h-6 text-brand-300 absolute inset-0 m-auto animate-bounce" />
                </div>

                <div className="space-y-2">
                  <h4 className="text-lg font-bold text-white">{generationStage}</h4>
                  <p className="text-xs text-slate-400 font-mono">
                    Executing deliberate pipeline & deterministic coverage passes...
                  </p>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-brand-600 to-indigo-500 h-2 transition-all duration-500 rounded-full"
                    style={{ width: `${generationPercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Job Description (Pasted Text)
                    </label>
                    <button
                      type="button"
                      onClick={handleLoadSingleDemo}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-950/70 hover:bg-brand-900/80 border border-brand-800 text-xs font-medium text-brand-300 transition-all hover:scale-105 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                      Load Demo Role
                    </button>
                  </div>
                  <textarea
                    required
                    rows={6}
                    value={jd}
                    onChange={e => setJd(e.target.value)}
                    placeholder="Paste the full job posting text here (responsibilities, required qualifications, bonus points)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors placeholder:text-slate-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Company Website URL
                    </label>
                    <input
                      type="url"
                      required
                      suppressHydrationWarning
                      value={companyUrl}
                      onChange={e => setCompanyUrl(e.target.value)}
                      placeholder="https://company.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors placeholder:text-slate-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Days to Interview
                      </label>
                      <span className="text-xs font-bold text-brand-400">{days} Days</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={60}
                      value={days}
                      onChange={e => setDays(parseInt(e.target.value, 10))}
                      className="w-full accent-brand-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-md shadow-brand-600/30 transition-all"
                  >
                    Generate Kit
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* BATCH UPLOAD MODAL (Section 2) */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-4 sm:p-6 md:p-8 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-brand-400" />
                Prepare Multiple Roles at Once
              </h3>
              <button
                onClick={() => {
                  if (isBatchRunning) {
                    batchAbortRef.current = true;
                    setIsBatchRunning(false);
                  }
                  setShowBatchModal(false);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-400">
                Paste a JSON array of role cases. Each is crawled & synthesized.
              </p>
              <button
                type="button"
                onClick={handleLoadExampleBatch}
                disabled={isBatchRunning}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-950/70 hover:bg-brand-900/80 border border-brand-800 text-xs font-medium text-brand-300 transition-all hover:scale-105 shadow-sm disabled:opacity-50 whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                Load Demo Batch
              </button>
            </div>

            <textarea
              rows={7}
              value={batchJson}
              disabled={isBatchRunning}
              onChange={e => setBatchJson(e.target.value)}
              placeholder={`[\n  {\n    "id": "case-01",\n    "jd": "Senior Full Stack Dev...",\n    "company_url": "https://stripe.com",\n    "days": 5\n  }\n]`}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-white focus:outline-none focus:border-brand-500 disabled:opacity-60"
            />

            {/* Live Progress Bar when running */}
            {isBatchRunning && batchProgress && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium">
                    Role {batchProgress.current} of {batchProgress.total} ({batchProgress.roleName})
                  </span>
                  <span className="text-brand-400 font-mono font-bold">{batchProgress.percent}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-brand-600 to-indigo-500 h-2 transition-all duration-300 rounded-full"
                    style={{ width: `${Math.max(5, batchProgress.percent)}%` }}
                  />
                </div>
              </div>
            )}

            {batchStatus && (
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-mono text-brand-300 flex items-center gap-2">
                {isBatchRunning ? (
                  <RotateCw className="w-4 h-4 text-brand-400 animate-spin flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                )}
                <span className="break-all">{batchStatus}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  if (isBatchRunning) {
                    batchAbortRef.current = true;
                    setIsBatchRunning(false);
                  }
                  setShowBatchModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Close
              </button>

              {isBatchRunning ? (
                <button
                  type="button"
                  onClick={handleStopBatch}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30 transition-all"
                >
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  Stop Batch
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBatchUpload}
                  disabled={!batchJson.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/30 transition-all disabled:opacity-50"
                >
                  Run Batch
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
