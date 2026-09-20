# Deployment

Spliter is a static single-page app (Vite + React Router's
`createBrowserRouter`) talking directly to Supabase from the browser —
there is no backend server to deploy. Any static host works; these
steps are written for Vercel (the natural fit for a Vite app) with
Netlify noted as the drop-in alternative.

## 1. Environment variables

Set these on the host (copy the names from `.env.example`):

| Variable                 | Where to find it                                          |
| ------------------------ | --------------------------------------------------------- |
| `VITE_APP_NAME`          | Cosmetic; `Spliter` is fine.                              |
| `VITE_SUPABASE_URL`      | Supabase dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Same page → Project API keys → `anon` `public`            |

Only variables prefixed `VITE_` are read by the build (Vite inlines
them into the client bundle at build time — there's no server-side
secret here, the anon key is meant to be public and RLS is what
actually protects data). Setting them in the host's dashboard (not
committing `.env`) is standard for any Vite deploy, not specific to
this project.

## 2. Build

```bash
npm ci
npm run build      # tsc -b && vite build → dist/
```

Vercel/Netlify both detect a Vite project automatically: build command
`npm run build`, output directory `dist`. No custom framework preset
needed.

## 3. SPA fallback rewrite (required)

The app uses `createBrowserRouter`, so every route (`/login`, `/signup`,
`/app`) is a real browser URL with no matching file on disk — a direct
load or refresh of `/app` must still serve `index.html` and let the
router take over client-side, or the host will 404 it.

**Vercel** — `vercel.json` at the repo root (already added):

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Netlify** — add a `public/_redirects` file instead (Vite copies
everything in `public/` into `dist/` unchanged), only if deploying
there instead of Vercel:

```
/*  /index.html  200
```

## 4. Point Supabase's Auth settings at the production URL

The live project ("Splitter-2.0") currently has no production domain
configured — its Auth redirect settings still assume local dev. Before
real users sign up against the deployed site:

1. Supabase dashboard → Authentication → URL Configuration.
2. Set **Site URL** to the production URL (e.g. `https://spliter.example.com`).
3. Add the same URL (and any preview-deploy domains, e.g. Vercel's
   `*.vercel.app` previews) to **Redirect URLs**.

Skipping this doesn't break sign-in/sign-out (this app doesn't use
OAuth redirects), but it does mean the "confirm your email" link in
Supabase's confirmation email will point at `localhost` instead of the
real site.

## 5. Known Supabase project settings worth revisiting before real users sign up

Carried over from earlier phases (see `PROJECT_STATE.md`'s "Open
items"), neither blocks a deploy but both are easy to fix once:

- **"Leaked Password Protection" is currently disabled** — Authentication
  → Policies in the dashboard, not a migration.
- **The default Supabase email sender has a very low rate limit**
  (discovered during this phase — a couple of signups per hour at
  most). Fine for early testing; configure a custom SMTP provider
  (Authentication → Settings → SMTP) before expecting more than a
  handful of signups in a short window.

## 6. Pre-deploy checklist

```bash
npm run typecheck
npm run lint
npm test              # Vitest — component/unit suite
npm run test:e2e       # Playwright — smoke test against a real build (see below)
npm run build
```

`npm run test:e2e` builds and serves the app itself (via
`playwright.config.ts`'s `webServer`), so it doesn't need the dev
server running first.

## 7. What the Playwright smoke test does and doesn't cover

It runs against a real production build in a real browser (desktop +
mobile viewports), checking routing/redirects, an automated
accessibility scan (axe-core), that the PWA manifest/icons resolve, and
that the login page has no horizontal overflow. It deliberately doesn't
sign in against the live Supabase project — email confirmation plus the
default SMTP rate limit (see above) make that impractical to script
reliably. **Do one real manual pass after every deploy**: sign up with a
real email, confirm it, sign in, and click through adding an expense,
recording a settlement, and viewing analytics once. This is the
"first real browser check" every phase since Phase 4 deferred — it
still hasn't been done against a real hosted deployment as of Phase 10.

## 8. PWA scope

This app ships a web manifest and icons (installable — "Add to Home
Screen" on mobile, "Install" on desktop Chrome), but no service worker.
It is not offline-capable; every load still needs a real network round
trip to Supabase. That's a deliberate, smaller scope than a full PWA —
revisit only if offline support becomes an actual requirement, since it
would need real thought about cache invalidation against live,
multi-device data (not something to bolt on casually).
