export interface Requirement {
  id: string;
  text: string;
  kind: 'technical' | 'behavioural' | 'domain';
  priority: 'must' | 'nice';
}

export interface Question {
  id: string;
  requirement_ids: string[];
  category: 'technical' | 'behavioural' | 'system-design' | 'company-fit';
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3;
  _provenance?: {
    origin: 'generated' | 'user_created' | 'user_edited';
    isPinned: boolean;
    modifiedAt?: string;
  };
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
  _provenance?: {
    origin: 'generated' | 'user_created' | 'user_edited';
    confidence: number; // 0: unreviewed, 1: needs practice, 2: neutral, 3: mastered
    lastReviewedAt?: string;
  };
}

export interface ScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number;
}

export interface Schedule {
  days_available: number;
  days: ScheduleDay[];
}

export interface Coverage {
  uncovered_requirement_ids: string[];
  passes: number;
}

export interface Source {
  company: string;
  company_url: string;
  role: string;
  location: string;
  jd_chars: number;
  researched_at: string;
  pages_used: string[];
}

export interface CompanyBrief {
  summary: string;
  what_they_do: string;
  sources: string[];
}

export interface Role {
  title: string;
  seniority: string;
  responsibilities: string[];
  requirements: Requirement[];
}

export interface Kit {
  source: Source;
  company_brief: CompanyBrief;
  role: Role;
  questions: Question[];
  flashcards: Flashcard[];
  schedule: Schedule;
  coverage: Coverage;
}

export interface KitRecord {
  id: string;
  userId: string;
  title: string;
  company: string;
  kit: Kit;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface MockEvaluationResult {
  score: number;
  verdict: string;
  strengths: string[];
  missedPoints: string[];
  improvementTip: string;
  suggestedConfidence: 1 | 2 | 3;
}
