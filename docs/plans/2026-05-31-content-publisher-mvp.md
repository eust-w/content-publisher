# Content Publisher MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create the first private repo for a low-cost multi-platform content management and publishing workflow.

**Architecture:** React + Vite provides the creator operations dashboard. Pure TypeScript domain modules define content drafts, platform capabilities, validation, and publish package generation so API adapters can be added without rewriting the UI.

**Tech Stack:** React, Vite, TypeScript, Vitest, lucide-react, GitHub private repository.

---

### Task 1: Domain Rules

**Files:**
- Create: `src/domain/publishPlan.test.ts`
- Create: `src/domain/publishPlan.ts`

**Step 1: Write the failing test**

Add tests for platform capability modes, video validation, package generation, and queue summary.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/publishPlan.test.ts`

Expected: FAIL because `src/domain/publishPlan.ts` does not exist.

**Step 3: Write minimal implementation**

Create typed platform rules and package generation.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/publishPlan.test.ts`

Expected: PASS.

### Task 2: Dashboard UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`
- Modify: `src/index.css`

**Step 1: Build UI from seeded domain data**

Show content rows, platform readiness, selected draft inspector, and package export.

**Step 2: Verify build**

Run: `npm run build`

Expected: TypeScript and Vite build pass.

### Task 3: Repo Hygiene and Publishing

**Files:**
- Modify: `README.md`
- Modify: `package.json`
- Create: `.gitignore`

**Step 1: Document scope**

Document low-cost approach, API boundaries, and commands.

**Step 2: Run checks**

Run: `npm test`, `npm run lint`, `npm run build`.

**Step 3: Commit and push**

Create a private GitHub repo and push with a gitmoji commit.
