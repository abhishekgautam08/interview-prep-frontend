'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth';
import {
  apiGetKit,
  apiUpdateKit,
  apiRegenerateCategory,
  apiRegenerateBrief,
  apiRegenerateSchedule,
} from '../../../lib/api';
import { Kit, KitRecord, Question, Flashcard } from '../../../types';
import {
  BookOpen,
  Sparkles,
  Play,
  RotateCw,
  Pin,
  Trash2,
  Plus,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowLeft,
  Clock,
  ExternalLink,
  Edit3,
  HelpCircle,
  Save,
  Check,
  AlertTriangle,
  MoveUp,
  MoveDown,
  Download,
  Printer,
} from 'lucide-react';

export default function KitBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const id = params.id as string;

  const [kitRecord, setKitRecord] = useState<KitRecord | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem(`prepkit_kit_${id}`);
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });
  const [kit, setKit] = useState<Kit | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem(`prepkit_kit_${id}`);
        if (cached) return JSON.parse(cached).kit;
      } catch (e) {}
    }
    return null;
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
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'questions' | 'brief' | 'schedule' | 'flashcards'>('questions');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'technical' | 'behavioural' | 'system-design' | 'company-fit'>('all');

  // Regeneration state
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenMessage, setRegenMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // New item modal
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [newQPrompt, setNewQPrompt] = useState('');
  const [newQOutline, setNewQOutline] = useState('');
  const [newQCategory, setNewQCategory] = useState<'technical' | 'behavioural' | 'system-design' | 'company-fit'>('technical');
  const [newQDifficulty, setNewQDifficulty] = useState<1 | 2 | 3>(2);

  // New flashcard modal
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');

  // Schedule days adjustment
  const [scheduleDays, setScheduleDays] = useState(5);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && id) {
      loadKitData();
    }
  }, [user, authLoading, id]);

  const loadKitData = async () => {
    if (!kit) {
      setLoading(true);
    }
    try {
      const data = await apiGetKit(id);
      setKitRecord(data);
      setKit(data.kit);
      setScheduleDays(data.kit.schedule.days_available);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(`prepkit_kit_${id}`, JSON.stringify(data));
        } catch (e) {}
      }
    } catch (err: any) {
      if (!kit) {
        setError(err.message || 'Failed to load kit');
      }
    } finally {
      setLoading(false);
    }
  };

  // Immediate optimistic save
  const triggerAutoSave = (updatedKit: Kit) => {
    setKit(updatedKit);
    setSaveStatus('saving');
    apiUpdateKit(id, updatedKit)
      .then(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      })
      .catch(err => {
        console.error('Failed to save kit updates:', err);
        setSaveStatus('idle');
      });
  };

  // -------------------------------------------------------------
  // Question Builder Handlers (Section 6)
  // -------------------------------------------------------------
  const handleUpdateQuestion = (qId: string, field: 'prompt' | 'answer_outline' | 'category' | 'difficulty', value: any) => {
    if (!kit) return;
    const updatedQuestions = kit.questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          [field]: value,
          _provenance: {
            ...q._provenance,
            origin: 'user_edited' as const,
            isPinned: q._provenance?.isPinned ?? false,
            modifiedAt: new Date().toISOString(),
          },
        };
      }
      return q;
    });

    triggerAutoSave({ ...kit, questions: updatedQuestions });
  };

  const handleTogglePin = (qId: string) => {
    if (!kit) return;
    const updatedQuestions = kit.questions.map(q => {
      if (q.id === qId) {
        const currentlyPinned = q._provenance?.isPinned ?? false;
        return {
          ...q,
          _provenance: {
            ...q._provenance,
            origin: q._provenance?.origin || 'generated',
            isPinned: !currentlyPinned,
          },
        };
      }
      return q;
    });

    triggerAutoSave({ ...kit, questions: updatedQuestions });
  };

  const handleDeleteQuestion = (qId: string) => {
    if (!kit) return;
    const updatedQuestions = kit.questions.filter(q => q.id !== qId);
    // Remove from schedule as well
    const updatedDays = kit.schedule.days.map(d => ({
      ...d,
      question_ids: d.question_ids.filter(qid => qid !== qId),
    }));

    triggerAutoSave({
      ...kit,
      questions: updatedQuestions,
      schedule: { ...kit.schedule, days: updatedDays },
    });
  };

  const handleMoveQuestion = (qId: string, direction: 'up' | 'down') => {
    if (!kit) return;
    const currentList = selectedCategory === 'all'
      ? kit.questions
      : kit.questions.filter(q => q.category === selectedCategory);

    const currentIndex = currentList.findIndex(q => q.id === qId);
    if (currentIndex === -1) return;
    const neighborIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (neighborIndex < 0 || neighborIndex >= currentList.length) return;

    const neighborId = currentList[neighborIndex].id;

    const fullIdx1 = kit.questions.findIndex(q => q.id === qId);
    const fullIdx2 = kit.questions.findIndex(q => q.id === neighborId);
    if (fullIdx1 === -1 || fullIdx2 === -1) return;

    const newQuestions = [...kit.questions];
    const temp = newQuestions[fullIdx1];
    newQuestions[fullIdx1] = newQuestions[fullIdx2];
    newQuestions[fullIdx2] = temp;

    triggerAutoSave({ ...kit, questions: newQuestions });
  };

  const handleAddCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kit || !newQPrompt.trim()) return;

    let maxNum = 0;
    kit.questions.forEach(q => {
      const n = parseInt(q.id.replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    });

    const newQ: Question = {
      id: `q${maxNum + 1}`,
      requirement_ids: [kit.role.requirements[0]?.id || 'r1'],
      category: newQCategory,
      prompt: newQPrompt.trim(),
      answer_outline: newQOutline.trim() || 'Key discussion points and architectural trade-offs.',
      difficulty: newQDifficulty,
      _provenance: {
        origin: 'user_created',
        isPinned: true,
        modifiedAt: new Date().toISOString(),
      },
    };

    const updatedQuestions = [newQ, ...kit.questions];
    setShowAddQuestionModal(false);
    setNewQPrompt('');
    setNewQOutline('');
    triggerAutoSave({ ...kit, questions: updatedQuestions });
  };

  // -------------------------------------------------------------
  // Flashcard Handlers (Section 6)
  // -------------------------------------------------------------
  const handleUpdateFlashcard = (fId: string, field: 'front' | 'back', value: string) => {
    if (!kit) return;
    const updatedCards = kit.flashcards.map(f => {
      if (f.id === fId) {
        return {
          ...f,
          [field]: value,
          _provenance: {
            ...f._provenance,
            origin: 'user_edited' as const,
            confidence: f._provenance?.confidence ?? 0,
          },
        };
      }
      return f;
    });

    triggerAutoSave({ ...kit, flashcards: updatedCards });
  };

  const handleDeleteFlashcard = (fId: string) => {
    if (!kit) return;
    const updatedCards = kit.flashcards.filter(f => f.id !== fId);
    triggerAutoSave({ ...kit, flashcards: updatedCards });
  };

  const handleAddCustomFlashcard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kit || !newCardFront.trim()) return;

    let maxNum = 0;
    kit.flashcards.forEach(f => {
      const n = parseInt(f.id.replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    });

    const newF: Flashcard = {
      id: `f${maxNum + 1}`,
      front: newCardFront.trim(),
      back: newCardBack.trim(),
      requirement_ids: [kit.role.requirements[0]?.id || 'r1'],
      _provenance: {
        origin: 'user_created',
        confidence: 0,
      },
    };

    const updatedCards = [newF, ...kit.flashcards];
    setShowAddCardModal(false);
    setNewCardFront('');
    setNewCardBack('');
    triggerAutoSave({ ...kit, flashcards: updatedCards });
  };

  // -------------------------------------------------------------
  // Company Brief Handlers (Section 6)
  // -------------------------------------------------------------
  const handleUpdateBrief = (field: 'summary' | 'what_they_do', value: string) => {
    if (!kit) return;
    triggerAutoSave({
      ...kit,
      company_brief: {
        ...kit.company_brief,
        [field]: value,
      },
    });
  };

  // -------------------------------------------------------------
  // Isolated Section Regeneration (Section 6)
  // -------------------------------------------------------------
  const handleRegenerateCategory = async (cat: string) => {
    if (!confirm(`Regenerate ${cat} questions? User-edited, custom, and pinned questions will be preserved.`)) {
      return;
    }

    setIsRegenerating(true);
    setRegenMessage(`Regenerating ${cat} questions while preserving your edits...`);

    try {
      const res = await apiRegenerateCategory(id, cat);
      setKitRecord(res);
      setKit(res.kit);
      setRegenMessage(`Successfully refreshed ${cat} questions!`);
      setTimeout(() => setRegenMessage(null), 3000);
    } catch (err: any) {
      alert(`Regeneration failed: ${err.message}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRegenerateBrief = async () => {
    setIsRegenerating(true);
    setRegenMessage('Regenerating company brief without modifying questions or schedule...');

    try {
      const res = await apiRegenerateBrief(id);
      setKitRecord(res);
      setKit(res.kit);
      setRegenMessage('Company brief regenerated successfully!');
      setTimeout(() => setRegenMessage(null), 3000);
    } catch (err: any) {
      alert(`Brief regeneration failed: ${err.message}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRegenerateSchedule = async (newDays: number) => {
    setIsRegenerating(true);
    setRegenMessage(`Re-running deterministic arithmetic schedule allocator for ${newDays} days...`);

    try {
      const res = await apiRegenerateSchedule(id, newDays);
      setKitRecord(res);
      setKit(res.kit);
      setScheduleDays(newDays);
      setRegenMessage(`Schedule successfully redistributed across ${newDays} days!`);
      setTimeout(() => setRegenMessage(null), 3000);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleExportJson = () => {
    if (!kit) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(kit, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    const safeTitle = (kit.role.title || 'prep_kit').toLowerCase().replace(/[^a-z0-9]/g, '_');
    downloadAnchor.setAttribute("download", `${(kit.source.company || 'company').toLowerCase()}_${safeTitle}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  if (error && !kit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-white">Unable to Load Interview Kit</h3>
        <p className="text-sm text-slate-400 max-w-md">{error}</p>
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={loadKitData}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all"
          >
            Retry Loading
          </button>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition-all"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !kit) {
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
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-brand-950/90 border border-brand-500/40 text-brand-300 shadow-xl backdrop-blur-md">
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

  const filteredQuestions = kit.questions.filter(
    q => selectedCategory === 'all' || q.category === selectedCategory
  );

  const mustHaves = kit.role.requirements.filter(r => r.priority === 'must');
  const uncoveredCount = kit.coverage.uncovered_requirement_ids.length;

  return (
    <div className="space-y-6 pb-16">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {kit.role.title}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-950 text-brand-400 border border-brand-800 font-medium">
                {kit.source.company}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
              <span>{kit.role.seniority} Level</span>
              <span>&bull;</span>
              <span>Researched {new Date(kit.source.researched_at).toLocaleDateString()}</span>
              {saveStatus === 'saving' && (
                <span className="text-brand-400 flex items-center gap-1">
                  <RotateCw className="w-3 h-3 animate-spin" /> Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportJson}
            title="Export Kit JSON (Appendix A format)"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-brand-400" />
            <span className="hidden sm:inline">Export JSON</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            title="Print or Save as PDF"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Print / PDF</span>
          </button>

          <Link
            href={`/kits/${id}/practice`}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-brand-600/25 transition-all hover:scale-105"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Practice Mode & AI Mock
          </Link>
        </div>
      </div>

      {/* Regeneration Status Toast */}
      {regenMessage && (
        <div className="p-3.5 rounded-xl bg-brand-950/80 border border-brand-800 text-brand-300 text-xs flex items-center gap-2 animate-fade-in">
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          <span>{regenMessage}</span>
        </div>
      )}

      {/* Requirements & Coverage Badge Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] uppercase font-semibold text-slate-400">Total Requirements</span>
          <div className="text-2xl font-bold text-white mt-1">{kit.role.requirements.length}</div>
          <span className="text-xs text-slate-400">{mustHaves.length} Must-Have &bull; {kit.role.requirements.length - mustHaves.length} Nice</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] uppercase font-semibold text-slate-400">Must-Have Coverage</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {uncoveredCount === 0 ? '100%' : `${Math.round(((mustHaves.length - uncoveredCount) / mustHaves.length) * 100)}%`}
          </div>
          <span className="text-xs text-slate-400">Passes executed: {kit.coverage.passes}</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] uppercase font-semibold text-slate-400">Question Bank</span>
          <div className="text-2xl font-bold text-white mt-1">{kit.questions.length}</div>
          <span className="text-xs text-slate-400">{kit.flashcards.length} Interactive Flashcards</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] uppercase font-semibold text-slate-400">Preparation Schedule</span>
          <div className="text-2xl font-bold text-brand-300 mt-1">{kit.schedule.days_available} Days</div>
          <span className="text-xs text-slate-400">{kit.schedule.days.reduce((acc, d) => acc + d.minutes, 0)} Total Minutes</span>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-slate-800 gap-4 sm:gap-6 text-sm font-medium overflow-x-auto whitespace-nowrap scrollbar-none pb-1">
        <button
          onClick={() => setActiveTab('questions')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'questions'
              ? 'border-brand-500 text-brand-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          Question Bank ({kit.questions.length})
        </button>

        <button
          onClick={() => setActiveTab('brief')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'brief'
              ? 'border-brand-500 text-brand-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Company Brief
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'schedule'
              ? 'border-brand-500 text-brand-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Study Schedule ({kit.schedule.days_available}d)
        </button>

        <button
          onClick={() => setActiveTab('flashcards')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'flashcards'
              ? 'border-brand-500 text-brand-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Play className="w-4 h-4" />
          Flashcards ({kit.flashcards.length})
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: QUESTION BANK BUILDER (Section 6)                   */}
      {/* ========================================================= */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          {/* Category Filter & Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex flex-wrap gap-2">
              {(['all', 'technical', 'behavioural', 'system-design', 'company-fit'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
                    selectedCategory === cat
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat === 'all' ? 'All Questions' : cat.replace('-', ' ')}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {selectedCategory !== 'all' && (
                <button
                  onClick={() => handleRegenerateCategory(selectedCategory)}
                  disabled={isRegenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-800 hover:bg-purple-900 text-purple-300 text-xs font-semibold transition-colors"
                  title="Regenerate only this category while preserving user edits and pinned questions"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                  Regenerate {selectedCategory}
                </button>
              )}

              <button
                onClick={() => setShowAddQuestionModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Question
              </button>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {filteredQuestions.map((q, idx) => {
              const isPinned = q._provenance?.isPinned ?? false;
              const isEdited = q._provenance?.origin === 'user_edited';
              const isCustom = q._provenance?.origin === 'user_created';

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl border transition-all space-y-3 ${
                    isPinned
                      ? 'bg-slate-900/90 border-brand-500/60 shadow-md shadow-brand-950/50'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400 uppercase">
                        {q.id}
                      </span>

                      {/* Category Badge & Re-categorizer */}
                      <select
                        value={q.category}
                        onChange={e => handleUpdateQuestion(q.id, 'category', e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-brand-300 font-medium focus:outline-none focus:border-brand-500 cursor-pointer"
                      >
                        <option value="technical">Technical</option>
                        <option value="behavioural">Behavioural</option>
                        <option value="system-design">System Design</option>
                        <option value="company-fit">Company Fit</option>
                      </select>

                      {/* Difficulty Selector */}
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700">
                        <span className="text-[10px] uppercase font-semibold text-slate-400">Diff:</span>
                        {[1, 2, 3].map(d => (
                          <button
                            key={d}
                            onClick={() => handleUpdateQuestion(q.id, 'difficulty', d)}
                            className={`w-4 h-4 rounded text-[10px] font-bold ${
                              q.difficulty === d
                                ? 'bg-brand-600 text-white'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>

                      {/* Provenance Indicators */}
                      {isPinned && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-950 text-brand-300 border border-brand-800 flex items-center gap-1 font-semibold">
                          <Pin className="w-2.5 h-2.5 fill-current" /> Pinned
                        </span>
                      )}
                      {isEdited && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold">
                          Edited
                        </span>
                      )}
                      {isCustom && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                          Custom
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleMoveQuestion(q.id, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
                        title="Move question up"
                      >
                        <MoveUp className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveQuestion(q.id, 'down')}
                        disabled={idx === filteredQuestions.length - 1}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
                        title="Move question down"
                      >
                        <MoveDown className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTogglePin(q.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isPinned
                            ? 'text-brand-400 bg-brand-950'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title={isPinned ? 'Unpin question' : 'Pin question (survives regeneration)'}
                      >
                        <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Delete question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Editable Question Prompt */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Question Prompt (Inline Editable)
                    </label>
                    <textarea
                      rows={2}
                      value={q.prompt}
                      onChange={e => handleUpdateQuestion(q.id, 'prompt', e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 text-sm text-white font-medium focus:outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>

                  {/* Inline Editable Answer Outline */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Model Answer Outline & Key Discussion Points
                    </label>
                    <textarea
                      rows={3}
                      value={q.answer_outline}
                      onChange={e => handleUpdateQuestion(q.id, 'answer_outline', e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>

                  {/* Mapped Requirement Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Covers:</span>
                    {q.requirement_ids.map(rid => {
                      const req = kit.role.requirements.find(r => r.id === rid);
                      return (
                        <span
                          key={rid}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700"
                          title={req?.text || rid}
                        >
                          {rid}: {req ? req.text.slice(0, 30) + '...' : rid}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: COMPANY BRIEF (Section 6)                           */}
      {/* ========================================================= */}
      {activeTab === 'brief' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">Company Intelligence & Brief</h3>
              <p className="text-xs text-slate-400">
                Crawled from {kit.source.company_url} and verified public discussion
              </p>
            </div>
            <button
              onClick={handleRegenerateBrief}
              disabled={isRegenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-800 hover:bg-purple-900 text-purple-300 text-xs font-semibold transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              Regenerate Brief
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Company Summary (Inline Editable)
              </label>
              <textarea
                rows={4}
                value={kit.company_brief.summary}
                onChange={e => handleUpdateBrief('summary', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                What They Do & Product Architecture
              </label>
              <textarea
                rows={4}
                value={kit.company_brief.what_they_do}
                onChange={e => handleUpdateBrief('what_they_do', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Pages Crawled & Sources Used
              </label>
              <div className="flex flex-wrap gap-2">
                {kit.company_brief.sources.map((src, i) => (
                  <a
                    key={i}
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-brand-300 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {src}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: STUDY SCHEDULE (Section 8)                          */}
      {/* ========================================================= */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">
                Deterministic Study Schedule ({kit.schedule.days_available} Days)
              </h3>
              <p className="text-xs text-slate-400">
                Arithmetic allocation: Harder/Must-haves scheduled earlier, strict integer minutes
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Adjust Days:</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  suppressHydrationWarning
                  value={scheduleDays}
                  onChange={e => setScheduleDays(parseInt(e.target.value, 10))}
                  className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono text-center"
                />
              </div>

              <button
                onClick={() => handleRegenerateSchedule(scheduleDays)}
                disabled={isRegenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-800 hover:bg-purple-900 text-purple-300 text-xs font-semibold transition-colors"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                Reallocate Schedule
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {kit.schedule.days.map(day => (
              <div
                key={day.day}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-300 font-bold text-xs">
                      D{day.day}
                    </span>
                    <h4 className="text-sm font-bold text-white">{day.focus}</h4>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                    <Clock className="w-3.5 h-3.5 text-brand-400" />
                    {day.minutes} mins
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {day.question_ids.map(qid => {
                    const q = kit.questions.find(item => item.id === qid);
                    return (
                      <div
                        key={qid}
                        className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="font-mono text-[10px] text-brand-400 font-bold">{qid}</span>
                          <span className="text-slate-300 truncate">{q?.prompt || qid}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 capitalize flex-shrink-0">
                          {q?.category || 'general'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: FLASHCARDS (Section 6 & 7)                          */}
      {/* ========================================================= */}
      {activeTab === 'flashcards' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">Flashcard Deck ({kit.flashcards.length})</h3>
              <p className="text-xs text-slate-400">
                Concepts, architectural patterns, and behavioral STAR outlines
              </p>
            </div>
            <button
              onClick={() => setShowAddCardModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Flashcard
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kit.flashcards.map(card => (
              <div
                key={card.id}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-brand-400 font-bold">{card.id}</span>
                  <button
                    onClick={() => handleDeleteFlashcard(card.id)}
                    className="p-1 text-slate-500 hover:text-rose-400"
                    title="Delete card"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Front (Question / Prompt)
                  </label>
                  <textarea
                    rows={2}
                    value={card.front}
                    onChange={e => handleUpdateFlashcard(card.id, 'front', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Back (Answer / Core Concepts)
                  </label>
                  <textarea
                    rows={3}
                    value={card.back}
                    onChange={e => handleUpdateFlashcard(card.id, 'back', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD QUESTION MODAL */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-4 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white">Add Custom Question</h3>

            <form onSubmit={handleAddCustomQuestion} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Question Prompt
                </label>
                <textarea
                  required
                  rows={2}
                  value={newQPrompt}
                  onChange={e => setNewQPrompt(e.target.value)}
                  placeholder="e.g. How would you design a distributed cache invalidation strategy?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Model Answer Outline
                </label>
                <textarea
                  rows={3}
                  value={newQOutline}
                  onChange={e => setNewQOutline(e.target.value)}
                  placeholder="Key architectural points, trade-offs, and metrics to cover..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={newQCategory}
                    onChange={e => setNewQCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  >
                    <option value="technical">Technical</option>
                    <option value="behavioural">Behavioural</option>
                    <option value="system-design">System Design</option>
                    <option value="company-fit">Company Fit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Difficulty (1-3)
                  </label>
                  <select
                    value={newQDifficulty}
                    onChange={e => setNewQDifficulty(parseInt(e.target.value, 10) as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  >
                    <option value={1}>1 - Fundamental</option>
                    <option value={2}>2 - Intermediate</option>
                    <option value={3}>3 - Senior / Complex</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddQuestionModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/30"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD FLASHCARD MODAL */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-4 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white">Add Custom Flashcard</h3>

            <form onSubmit={handleAddCustomFlashcard} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Card Front (Concept or Question)
                </label>
                <textarea
                  required
                  rows={2}
                  value={newCardFront}
                  onChange={e => setNewCardFront(e.target.value)}
                  placeholder="e.g. What are the trade-offs of optimistic locking?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Card Back (Explanation & Takeaways)
                </label>
                <textarea
                  required
                  rows={3}
                  value={newCardBack}
                  onChange={e => setNewCardBack(e.target.value)}
                  placeholder="e.g. Good for low contention, avoids db lock bottlenecks, but requires rollback retry logic..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddCardModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/30"
                >
                  Save Flashcard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
