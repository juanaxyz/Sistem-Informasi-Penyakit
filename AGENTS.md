# AGENTS.md — Panduan Agent untuk Proyek Ini

## Commands

- `npm run lint` — ESLint (`.ts`, `.tsx`)
- `npm run dev` — Vite dev server
- `npm run preview` — Vite preview of production build

Server (separate, in `server/`):
- `npm run dev` — Express API on port 4000 via `tsx watch`
- `npm start` — Express API tanpa watch
- `npm run typecheck` — `tsc --noEmit`
- `npm run db:setup` — terapkan migrasi SQL (`server/migrations/`)

## Context Files

Read these before every session (in `context/`):
- `PRD.md` — product requirements
- `PROJECT.md` — tech stack, folder structure, conventions
- `DATABASE.md` — PostgreSQL schema (skema Indonesia, sudah ada datanya)
- `DESIGN.md` — UI/body map contract
- `TASKS.md` — phased task list with acceptance criteria. **Work in order. Don't start next phase until current criteria pass.**
- `frontend-architecture.md` — arsitektur frontend (layer, hooks, kontrak `{ data, loading, error }`, tipe API)

Log setiap sesi ke folder `logs/` — satu file per sesi. Jangan update `dakam.md`.

## Current Phase

FASE 0–3 (Project Init, Backend & DB, Data Layer Hooks, Body Map Integration) are complete — Express + PostgreSQL lokal (keputusan final; Supabase dibatalkan). Next: FASE 4 (pencarian & sistem tubuh).

## Styling

Tailwind CSS v4 is configured (`@tailwindcss/vite` in `vite.config.ts`, `@import "tailwindcss"` in `index.css`). The body map component currently uses **Tailwind** (`BodyMap.tsx`); `BodyMap.module.css` masih ada tapi tidak diimpor (jangan dihapus). Both are available — use whichever fits the component. Do not remove either.

## Backend

Express API in `server/` using `pg` (PostgreSQL). Routes in `server/src/routes/`. Runs on port 4000. Frontend and server are separate processes (Vite proxies `/api` → `localhost:4000` in dev).

> Operasional: `tsx watch` **tidak auto-reload** di mount WSL2 9p (`/mnt/d`). Setelah mengubah route server, restart manual (`npm start` atau kill + `npm run dev`) — jangan mengandalkan watch.

## Hard Constraints

- No diagnosis/AI prediction features.
- No Supabase service_role keys or secrets in client code (Supabase tidak dipakai — batasan tetap berlaku).
- No create/update/delete operations from client for MVP.
- Do not modify `context/DATABASE.md` without explaining why.
- Do not add large dependencies without justification.
- UI language: Bahasa Indonesia, simple, avoid heavy medical jargon.
- State management: `useState`/`useEffect` only (no Redux/Zustand for MVP).
- Routing: `react-router-dom` (only when reaching FASE 5).
