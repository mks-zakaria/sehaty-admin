# sehaty-admin

Staff console for the Sehaty platform — a Turborepo monorepo (npm workspaces).

The only fully working surface today is **Accreditation**: an admin signs in and
approves doctors awaiting licence verification. Everything else (Users,
Subscriptions, Reviews, Ranking, Dashboard) is a disabled placeholder in the
left nav. One page, one job.

## Layout

```
sehaty-admin/
├─ apps/
│  └─ admin/                 # Next.js 15 App Router + TS + Tailwind (Turbopack dev)
│     ├─ app/
│     │  ├─ page.tsx         # → redirects to /accreditation
│     │  ├─ login/           # admin sign in
│     │  └─ accreditation/   # approve pending doctors (the working page)
│     ├─ components/         # ConsoleShell (left nav)
│     ├─ lib/api.ts          # fetch wrapper + typed endpoints
│     └─ Dockerfile          # standalone Next output
└─ packages/
   ├─ ui/                    # shared Button / Card / Spinner (Tailwind)
   ├─ tsconfig/              # base + Next tsconfig
   └─ eslint-config/         # shared ESLint config
```

## Develop

```bash
npm install
npm run dev        # turbo → next dev --turbopack (apps/admin on :3000)
npm run build      # turbo build → next build
npm run lint
npm run typecheck
```

## Configuration

| Env var               | Default                 | Purpose                          |
| --------------------- | ----------------------- | -------------------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Base URL of the Sehaty API.      |

The admin bearer token is stored client-side in `localStorage` under
`sehaty-admin-token` after login.

## API surface used

- `POST /api/v1/auth/login` → `{ access, refresh, role }`
- `GET  /api/v1/admin/professionals?pending=true`
- `POST /api/v1/admin/professionals/{user_id}/accredit`

All admin routes require a Bearer **ADMIN** token.

## CI / Release

- **primary** — on push/PR to `main`: `npm install` → `turbo build` → `turbo lint`.
- **release** — on push to `main`: npm `semantic-release` bumps the version,
  updates the changelog, and tags `vX.Y.Z`.
