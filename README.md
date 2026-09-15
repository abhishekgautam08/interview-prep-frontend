# The AI Interview Prep Kit — Frontend Web Application

> **ID:** `FS-AI-INTERVIEW-01` | **Client:** Full-Stack Engineering  
> **Repository:** `interview-prep-frontend` (Standalone Next.js Frontend)

A modern, highly responsive Next.js application designed for interview preparation with real-time generation feedback, an inline reshapeable Kit Builder, spaced-repetition flashcards, and an interactive AI Mock Interviewer.

---

## 1. Quick Start

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Backend Service**: Running on `http://localhost:5000` (from `interview-prep-backend`)

### Installation & Development
```bash
git clone <repository-url>
cd interview-prep-frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 2. Key Features

### 1. The Builder (Section 6)
- **Inline Editing**: Edit any question prompt, answer outline, flashcard, or company brief directly inline with immediate optimistic UI updates.
- **Reordering & Categorization**: Reassign questions across `technical`, `behavioural`, `system-design`, and `company-fit`.
- **State Preservation During Regeneration**:
  - Click **"Regenerate [Category]"** to refresh only that section.
  - Questions marked with `origin: 'user_edited'`, `origin: 'user_created'`, or `isPinned: true` are guaranteed to survive regeneration!
- **Schedule Allocation**: Real-time day adjustment (1 to 60 days) with arithmetic reallocation.

### 2. Practice Mode & Spaced Repetition (Section 7)
- **3D Flip Cards**: Click card or press `Space` to flip and reveal answer outlines.
- **Confidence Rating**: Rate each card as `[1] Needs Practice`, `[2] Neutral`, or `[3] Mastered`.
- **Confidence-Weighted Sorting**: Future practice sessions automatically sort by least confident cards first and prioritize unreviewed must-haves.
- **Keyboard Shortcuts**:
  - `Space`: Flip card
  - `1`: Rate Needs Practice
  - `2`: Rate Neutral
  - `3`: Rate Mastered
  - `←` / `→`: Navigate previous/next card

### 3. Creative Feature: AI Mock Interviewer (Section 14)
- Select any question from your kit.
- Type or speak your response.
- Receive instant structured feedback:
  - Overall score (1-5) and verdict
  - Strengths demonstrated
  - Blindspots and missed architectural depth
  - Actionable improvement tip
  - Automatic synchronization with flashcard confidence rating

### 4. Multi-Role Batch Preparation (Section 2)
- Upload or paste JSON arrays of description-and-company pairs to generate multiple kits in sequence.

---

## 3. Environment Variables (`.env.local`)

```ini
NEXT_PUBLIC_API_URL=http://localhost:5000
```
When deploying to Vercel, set `NEXT_PUBLIC_API_URL` to your production backend URL (e.g. on Render, Railway, or Fly.io).
