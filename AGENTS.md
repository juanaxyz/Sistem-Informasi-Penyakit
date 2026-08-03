# AGENTS.md — Panduan Agent untuk Proyek Ini

## Commands

- `npm run lint` — ESLint (`.ts`, `.tsx`)
- `npm run dev` — Vite dev server
- `npm run preview` — Vite preview of production build
- `npm run build` — `tsc -b` lalu Vite build produksi ke `dist/`

## Context Files

Read these before every session (in `context/`):
- `PRD.md` — product requirements
- `PROJECT.md` — tech stack, folder structure, conventions
- `DATABASE.md` — Supabase/PostgreSQL schema (skema Indonesia, sudah ada datanya)
- `DESIGN.md` — UI/body map contract
- `TASKS.md` — phased task list with acceptance criteria. **Work in order. Don't start next phase until current criteria pass.**
- `frontend-architecture.md` — arsitektur frontend (layer, hooks, kontrak `{ data, loading, error }`, tipe data)

Log setiap sesi ke folder `logs/` — satu file per sesi. Jangan update `dakam.md`.

## Current Phase

FASE 0–6 are complete. Backend Express + PostgreSQL lokal has been **removed** (03 Aug 2026) — frontend reads data **directly from Supabase** (PostgREST) via `@supabase/supabase-js`, deploy on Vercel. Remaining: finalize README + final medical data.

## Styling

Tailwind CSS v4 is configured (`@tailwindcss/vite` in `vite.config.ts`, `@import "tailwindcss"` in `index.css`). The body map component currently uses **Tailwind** (`BodyMap.tsx`); `BodyMap.module.css` masih ada tapi tidak diimpor (jangan dihapus). Both are available — use whichever fits the component. Do not remove either.

## Data layer (Supabase)

No backend server. All reads go through hooks in `src/hooks/` built on `useSupabaseQuery` (generic query hook), using the client in `src/lib/supabase.ts`. Env: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `.env` root (see `.env.example`). RLS public-read is active — anon key is safe in browser. Never use service_role keys in client code.

> Images: `gambar_konten.url_gambar` is a relative path `/uploads/penyakit/...` → file in `public/uploads/penyakit/`.

## Hard Constraints

- No diagnosis/AI prediction features.
- No Supabase service_role keys or secrets in client code.
- No create/update/delete operations from client for MVP.
- Do not modify `context/DATABASE.md` without explaining why.
- Do not add large dependencies without justification.
- UI language: Bahasa Indonesia, simple, avoid heavy medical jargon.
- State management: `useState`/`useEffect` only (no Redux/Zustand for MVP).
- Routing: `react-router-dom` (already active, FASE 5+).
