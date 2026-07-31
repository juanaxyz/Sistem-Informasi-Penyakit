# AGENTS.md — Panduan Agent untuk Proyek Ini

## Commands

- `npm run lint` — ESLint (`.ts`, `.tsx`)
- `npm run dev` — Vite dev server
- `npm run preview` — Vite preview of production build

Server (separate):
- `npm run dev` (in `server/`) — Express API on port 4000 via `tsx`

## Context Files

Read these before every session (in `context/`):
- `PRD.md` — product requirements
- `PROJECT.md` — tech stack, folder structure, conventions
- `DATABASE.md` — PostgreSQL schema (not yet created)
- `DESIGN.md` — UI/body map contract
- `TASKS.md` — phased task list with acceptance criteria. **Work in order. Don't start next phase until current criteria pass.**

Log setiap sesi ke folder `logs/` — satu file per sesi. Jangan update `dakam.md`.

## Current Phase

FASE 0 (Project Init & Body Map) is complete. Next: FASE 1 (Supabase setup).

## Styling

Tailwind CSS v4 is configured (`@tailwindcss/vite` in `vite.config.ts`, `@import "tailwindcss"` in `index.css`). The body map component currently uses CSS Modules (`*.module.css`). Both are available — use whichever fits the component. Do not remove either.

## Backend

Express API in `server/` using `pg` (PostgreSQL). Routes in `server/src/routes/`. Runs on port 4000. Frontend and server are separate processes.

## Hard Constraints

- No diagnosis/AI prediction features.
- No Supabase service_role keys or secrets in client code.
- No create/update/delete operations from client for MVP.
- Do not modify `context/DATABASE.md` without explaining why.
- Do not add large dependencies without justification.
- UI language: Bahasa Indonesia, simple, avoid heavy medical jargon.
- State management: `useState`/`useEffect` only (no Redux/Zustand for MVP).
- Routing: `react-router-dom` (only when reaching FASE 5).
