# Deploying Shopbuddy to Vercel

Shopbuddy is a **server-rendered Next.js 16 app** (App Router, Server Actions,
`proxy.ts`, Drizzle + Supabase). It is **not** a static site — every route is
rendered on demand (`ƒ` in the build output). Vercel must build and serve it with
the **Next.js framework preset**, and the runtime **environment variables must be
set**, or the site will not work.

---

## Symptom → root cause (the "Ready but 404" case)

If the Vercel deployment shows **Ready** but the live site returns
`404: NOT_FOUND` (`X-Vercel-Error: NOT_FOUND`) on every page **while static files
still load** (e.g. `/next.svg`, `/products/*.svg` return `200`), then Vercel is
serving the `public/` folder as a **static site** and never running the Next.js
server. This happens when the project's **Framework Preset is not "Next.js"**
(or an Output Directory override points at static output).

- Static asset 200 + every app route 404 = framework/output misconfig (this doc).
- App route **500** (`MIDDLEWARE_INVOCATION_FAILED` / `FUNCTION_INVOCATION_FAILED`)
  = framework is correct but **env vars are missing** (jump to step 2).

`vercel.json` in this repo pins `"framework": "nextjs"` so a fresh deploy builds
correctly. Still verify the dashboard settings below, then set env vars.

---

## Step 1 — Build & framework settings (Vercel → Project → Settings → Build & Deployment)

| Setting           | Value                                  |
| ----------------- | -------------------------------------- |
| Framework Preset  | **Next.js**                            |
| Root Directory    | `./` (repo root — where `package.json` is) |
| Build Command     | default (`next build`) — leave unset   |
| Output Directory  | **default — leave unset/empty** (Next manages `.next`; do NOT set `public`) |
| Install Command   | default                                |

> If "Output Directory" is set to `public` or `out`, **clear it**. That override is
> the usual reason static files serve but routes 404.

## Step 2 — Environment variables (Settings → Environment Variables)

Add these for the **Production** environment (and Preview, if you use it). Values
come from your local `.env.local` — paste them in; never commit them.

### Required (the app 500s at runtime without these)

| Variable                        | Notes                                                        |
| ------------------------------- | ------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL (browser-exposed).                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key (browser-exposed).             |
| `SUPABASE_SERVICE_ROLE_KEY`     | **Server-only secret.** Bypasses RLS — never expose.         |
| `DATABASE_URL`                  | **Server-only secret.** Supabase **pooler** URI (port 6543) for serverless. Used by Drizzle for trusted reads. |

### Recommended

| Variable               | Notes                                                                 |
| ---------------------- | --------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | Set to the live origin, e.g. `https://shopbuddy.africa` (no trailing slash). Used for auth email-confirmation redirects and links in transactional email. Wrong/missing value breaks sign-up confirmation links. |

### Optional (features degrade gracefully — app still runs without them)

| Variable                                            | Enables                                  |
| --------------------------------------------------- | ---------------------------------------- |
| `ANTHROPIC_API_KEY`                                 | AI message translation (no-ops if unset).|
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`               | Transactional email (no-ops if unset).   |
| `OPENEXCHANGERATES_APP_ID`                          | Live FX rates (falls back to constants). |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`              | Error monitoring (disabled if unset).    |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Build-time source-map upload (optional). |

### Do NOT set on Vercel (local CLI / seed scripts only)

`GEMINI_API_KEY`, `SEED_PASSWORD`, `SEED_IMAGE_DELAY_MS` — used only by one-off
seed scripts run from your machine, never at request time. Paddle/Flutterwave keys
in `.env.example` are placeholders for future payment work and are not yet read by
any runtime code.

## Step 3 — Redeploy

Settings changes apply to the **next** deployment. Either push a commit (Git
integration auto-deploys) or **Deployments → ⋯ → Redeploy** on the latest one.
Make sure "Use existing Build Cache" is **off** for the first redeploy after
changing the framework preset.

---

## Verify after deploy

```bash
# Should be 200 (home renders the catalog at the default locale):
curl -s -o /dev/null -w "%{http_code}\n" https://shopbuddy.africa/
# Localised routes — all 200:
curl -s -o /dev/null -w "%{http_code}\n" https://shopbuddy.africa/sw
curl -s -o /dev/null -w "%{http_code}\n" https://shopbuddy.africa/products
```

If `/` is **200** you're done. If you now get **500**, env vars are still missing
or wrong (re-check step 2, especially `DATABASE_URL` and the Supabase keys).

---

## Note: Deployment Protection (the 401 on the `*-projects.vercel.app` URL)

The auto-generated deployment URL (e.g. `cargo-scope-xxxx-...vercel.app`) may return
**401** with a `_vercel_sso_nonce` cookie — that's **Vercel Deployment Protection**
(Vercel Authentication), on by default. It does **not** affect the production domain
`shopbuddy.africa`. To make preview URLs publicly shareable:
**Settings → Deployment Protection → Vercel Authentication → Disabled** (or set to
standard-protection-with-bypass as you prefer).
# ShopBuddy sourcing, CMS and reporting launch checklist

The public flow is `/sourcing`. Requests are currently submitted immediately as
`New`; the sourcing team follows up by email or WhatsApp with activation and
next steps. The future payment webhook remains available at
`/api/payments/flutterwave/webhook`, but the public form does not start an online
checkout until ShopBuddy's merchant account is ready.

Paddle remains the Merchant of Record for recurring supplier plans. Configure
the two recurring prices and `/api/paddle/webhook`; subscription status is
updated by verified Paddle events.

Required operational settings:

- `SOURCING_TO_EMAIL`: main Gmail that receives new RFQs (defaults to
  `shopbuddyafrica@gmail.com`).
- `INFO_CC_EMAILS`: comma-separated info addresses to CC.
- `CRON_SECRET`: random secret used by the Monday 06:00 UTC / 09:00 EAT report.
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`: Search Console token value.
- Flutterwave, Paddle and Resend production credentials from `.env.example`.

Admin/CMS access already uses Supabase login and the `admin_emails` allowlist.
The allowlisted Gmail accounts can sign in at `/sign-in` and open `/admin/blog`
to manage article text, images/videos, categories, featured images, SEO titles,
meta descriptions, drafts and publishing.

Business confirmation still required before production payments: confirm the
registered merchant/entity and customer-facing payment descriptor. The code
cannot determine whether ShopBuddy Africa is a registered entity or whether the
Flutterwave/Paddle account settles to ShopBuddy Africa or Cargo Scope. Configure
the provider account and statement descriptor under ShopBuddy Africa if that is
the registered/approved merchant; otherwise use the legally registered Cargo
Scope entity and disclose it clearly at checkout.

Vercel provides TLS/SSL and immutable deployment rollbacks. Enable Supabase
Point-in-Time Recovery or scheduled database backups in the Supabase dashboard;
database backups are an account-level setting and cannot be truthfully enabled
from this repository alone. Storage/database RLS and security headers ship with
the app.
