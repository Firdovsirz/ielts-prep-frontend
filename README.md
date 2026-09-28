# IELTS Prep — frontend

The web app for [IELTS Prep](https://github.com/Firdovsirz/ielts-prep-backend): practice screens for all four papers,
grading feedback, grammar, vocabulary, dashboard, study plan, coach reports and mock tests.

React 19 · TypeScript · Vite · TanStack Query · Recharts · openapi-fetch. It is served in production by nginx, which
also proxies `/api` to the backend.

> **Deploying the whole app?** Use the backend repository: `git clone https://github.com/Firdovsirz/ielts-prep-backend.git ielts-prep && ielts-prep/deploy.sh`
> clones this repository into `ielts-prep/frontend` and starts everything with one command.

## Run with Docker (this repository alone)

```bash
cp .env.example .env            # BACKEND_URL = where the API runs (default: a backend on the Docker host, :8090)
docker compose up -d --build    # or docker-compose → http://localhost:3000
```

| Variable | Default | Meaning |
|---|---|---|
| `BACKEND_URL` | `http://host.docker.internal:8090` | Where nginx proxies `/api` |
| `FRONTEND_PORT` | `3000` | Host port |
| `FRONTEND_BIND` | `0.0.0.0` | `127.0.0.1` to accept connections only from a reverse proxy on the same machine |

The image (`Dockerfile`) builds the app with Node 22 and serves `dist/` with nginx (`nginx.conf.template`). It allows
60 MB uploads for Speaking recordings, uses 300 s proxy timeouts for grading, and falls back to `index.html` for
client-side routes.

## Develop

Requirements: Node.js 22 LTS or newer, and the backend running on `http://localhost:8090`.

```bash
npm ci
npm run dev          # http://localhost:5173 — /api is proxied to BACKEND_URL or http://localhost:8090
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm test` | Vitest unit tests (pure helpers in `src/lib`) |
| `npm run typecheck` / `npm run lint` / `npm run format` | TypeScript, ESLint, Prettier |
| `npm run gen:api` | Regenerate `src/api/schema.d.ts` from the backend's OpenAPI spec |

`gen:api` reads `../docs/api/openapi.json` (this repository cloned inside the backend repository). On its own, point it
at a running backend: `OPENAPI_SPEC=http://localhost:8090/v3/api-docs npm run gen:api`.

## Layout

```
src/api/         typed API client; schema.d.ts is generated — do not edit
src/app/         router, layout, auth
src/features/    one folder per page: reading, listening, writing, speaking, grammar, vocab, dashboard, plan, coach, mock, settings …
src/components/  shared UI: question renderers, charts and figures, timers, feedback
src/lib/         pure helpers (unit-tested): chart data, countdowns, voices, marking highlights, vocabulary, plan actions
src/styles.css   design system — IELTS-inspired crimson and navy, light and dark themes
```

Independent study tool — not affiliated with or endorsed by IELTS, the British Council, IDP or Cambridge University
Press & Assessment.
