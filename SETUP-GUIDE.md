# DBMartNG — Complete Setup Guide

This guide walks you through getting API keys **from every service** the app uses.  
Follow these in order — some service credentials are needed in later steps.

---

## 📋 Quick Overview

| # | Service | CLI Available? | Purpose | Sign Up |
|---|---------|---------------|---------|---------|
| 1 | **Supabase** | ✅ `npx supabase` | Database, Auth, Storage | https://supabase.com |
| 2 | **Paystack** | ❌ No CLI | Nigerian Payments | https://paystack.com |
| 3 | **Google Gemini** | ❌ No CLI | AI Chat Assistant | https://aistudio.google.com |
| 4 | **Resend** | ❌ No CLI | Transactional Email | https://resend.com |
| 5 | **Cloudflare Turnstile** | ❌ No CLI | CAPTCHA / Bot Protection | https://dash.cloudflare.com |
| 6 | **Tawk.to** | ❌ No CLI | Live Chat Widget | https://tawk.to |
| 7 | **Vercel** | ✅ `npx vercel` | Hosting & Deployment | https://vercel.com |

---

## 1. Supabase (Database & Auth) — Has CLI

### Get Credentials (Dashboard)

1. Go to https://supabase.com → **Sign in / Sign up** (GitHub or email)
2. Click **New Project**
   - Name: `dbmartng`
   - Database Password: **Save this securely!**
   - Region: **South Africa** (closest to Nigeria — `af-south-1`)
   - Pricing: **Free tier** is enough to start
3. Wait ~2 minutes for the database to provision
4. Go to **Project Settings → API**
   - Copy `Project URL` → your `.env.local` → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy `anon public` → your `.env.local` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role secret` → your `.env.local` → `SUPABASE_SERVICE_ROLE_KEY`

### Run Migrations (SQL Editor)

5. Go to **SQL Editor** in the Supabase Dashboard
6. Open and run these files **in order** (copy-paste each one):
   - 📄 `migrations/001_initial_schema.sql`
   - 📄 `migrations/002_social_activities.sql`
   - 📄 `migrations/003_add_referred_name.sql`
   - 📄 `migrations/004_seed_data.sql`

### Optional: Link Supabase CLI (for future migrations)

```bash
# Only if npm install works locally
npx supabase login
npx supabase link --project-ref <your-project-ref>
# Then: npm run db:migrate
```

> **Your project ref** is in your Supabase project URL:  
> `https://supabase.com/dashboard/project/<REF>`

---

## 2. Paystack (Payments) — No CLI

### Get Credentials

1. Go to https://paystack.com → **Create Account**
   - Use your Nigerian email & phone
   - Complete KYC verification (required for live keys)
2. Go to **Settings → API Keys & Webhooks**
   - Copy `Public Key` → `.env.local` → `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`  
     (Format: `pk_test_xxxxxxxxxxxxxxxxxxxx` or `pk_live_xxxxx`)
   - Copy `Secret Key` → `.env.local` → `PAYSTACK_SECRET_KEY`  
     (Format: `sk_test_xxxxxxxxxxxxxxxxxxxx` or `sk_live_xxxxx`)
3. Set **Webhook Secret**:
   - Click **"Create Webhook URL"** or go to **Webhook Settings**
   - Set a custom webhook secret → `.env.local` → `PAYSTACK_WEBHOOK_SECRET`
   - Set Webhook URL (after deployment):  
     `https://dbmart.ng/api/webhooks/paystack`

### Test Mode vs Live Mode

- **Test keys** (`pk_test_` / `sk_test_`): Use for development. Test cards:  
  `4084084084084081` — success | `4084080000000409` — failure
- **Live keys** (`pk_live_` / `sk_live_`): Production. Require KYC verification.

### Paystack API Docs

No CLI exists for Paystack. The app uses Paystack's REST API directly:
- Transaction initialization → `POST https://api.paystack.co/transaction/initialize`
- Plan creation → `POST https://api.paystack.co/plan`
- Subscription management → `GET /subscription`
- Webhook verification → HMAC-SHA512 signature check

See: https://paystack.com/docs/api

---

## 3. Google Gemini (AI Chat) — No CLI

### Get Credentials

1. Go to https://aistudio.google.com
2. Sign in with your Google account
3. Click **"Get API Key"** in the left sidebar
4. Click **"Create API Key"**
   - Select an existing Google Cloud project or create a new one
5. Copy the key → `.env.local` → `GEMINI_API_KEY`

### Pricing (Free Tier)

- **Gemini 1.5 Flash**: 15 requests per minute, 1 million tokens per minute **free**
- **Gemini 2.0 Flash**: Also free tier available
- No credit card required to start

### How the app uses it

- The app uses `@google/generative-ai` npm package
- API endpoint: `POST /api/ai/chat`
- Model: `gemini-1.5-flash` (fast, cost-effective)
- Features: Vendor search via function calling, platform Q&A

---

## 4. Resend (Transactional Email) — No CLI

### Get Credentials

1. Go to https://resend.com → **Sign up** (GitHub or Google)
2. Verify your domain (or use the sandbox domain for testing):
   - Testing: Emails go to your inbox only via the sandbox domain
   - Production: Add your custom domain (e.g., `dbmart.ng`) in **Domains**
3. Go to **API Keys** → **Create API Key**
   - Name: `DBMartNG Production`
   - Permission: `Sending access`
   - Copy the key → `.env.local` → `RESEND_API_KEY` (Format: `re_xxxxxxxxxxxx`)

### Pricing (Free Tier)

- **100 emails/day free**
- **3,000 emails/month free**
- No credit card required

### How the app uses it

- The app calls Resend's REST API directly (no npm SDK needed)
- Sends: welcome emails, notification alerts, subscription receipts
- Fallback: Logs to console when `RESEND_API_KEY` is not set (dev mode)

---

## 5. Cloudflare Turnstile (CAPTCHA) — No CLI

### Get Credentials

1. Go to https://dash.cloudflare.com → **Sign up / Sign in**
2. In the left sidebar, find **Turnstile** (under "Security" or search for it)
3. Click **"Add Site"**
   - Site Name: `DBMartNG`
   - Domain: `dbmart.ng` (add `localhost` for development)
   - Widget Type: **Managed** (invisible)
4. After creation, copy the **Site Key** → `.env.local` → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`  
   (Format: `0x4AAAAAAAxxxxxxxxxxxx`)

### Pricing

- **100% Free** — no paid tier, no usage limits

### How the app uses it

- Injected via `<script>` tag in `Turnstile.tsx`
- Used on: Auth page signup, Careers form
- Fails silently when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is not set

---

## 6. Tawk.to (Live Chat) — No CLI

### Get Credentials

1. Go to https://tawk.to → **Sign up free** (email or Google)
2. After login, you'll be in your dashboard
3. Go to **Administration** (gear icon) → **Property Settings**
4. You'll see:
   - **Property ID** → `.env.local` → `NEXT_PUBLIC_TAWK_PROPERTY_ID`
   - **Widget ID** → `.env.local` → `NEXT_PUBLIC_TAWK_WIDGET_ID`
5. (Optional) Customize the chat widget appearance

### Pricing (Free Tier)

- **Free forever** — unlimited agents, unlimited chats
- Paid plans add: chat history, reporting, CRM integrations

### How the app uses it

- Script injected dynamically in `LiveChatView.tsx`
- Chat widget is available in the bottom-right corner
- Toggle between "AI Assistant" and "Live Chat" tabs

---

## 7. Vercel (Hosting) — Has CLI

This step requires npm install, so we'll use the **GitHub import method** instead.

### Deploy via GitHub (no local npm needed)

1. Push your code to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/dbmartng.git
   git push -u origin main
   ```

2. Go to https://vercel.com/new
3. **Import** your `dbmartng` repository
4. Vercel auto-detects Next.js — keep default settings
5. Click **"Environment Variables"** and add ALL variables from `.env.local.example`
6. Click **Deploy** — Vercel runs `npm install` automatically in the cloud

### Set up Custom Domain (optional)

1. Go to your Vercel project → **Settings → Domains**
2. Add `dbmart.ng` and follow DNS instructions

### Post-Deployment Vercel Commands

```bash
# Link local project (requires working npm)
npx vercel link --yes

# View deployment logs
npx vercel logs

# Set env vars via CLI
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
```

---

## Setting Environment Variables (in Vercel)

After importing your repo on Vercel:

1. Go to **Project Dashboard → Settings → Environment Variables**
2. Add **ALL 14 variables** from this table:

| Variable | Example | Where to Get |
|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Supabase Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Supabase Settings → API |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | `pk_test_xxxxxxxxx` | Paystack Settings → API Keys |
| `PAYSTACK_SECRET_KEY` | `sk_test_xxxxxxxxx` | Paystack Settings → API Keys |
| `PAYSTACK_WEBHOOK_SECRET` | `any-secret-string` | Set during webhook config |
| `GEMINI_API_KEY` | `AIzaSyxxxxxxxxx` | Google AI Studio |
| `RESEND_API_KEY` | `re_xxxxxxxxxxxx` | Resend → API Keys |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `0x4AAAAAAAxxxx` | Cloudflare → Turnstile |
| `NEXT_PUBLIC_TAWK_PROPERTY_ID` | `xxxxxxxxxxxxxxxxx` | Tawk.to → Property Settings |
| `NEXT_PUBLIC_TAWK_WIDGET_ID` | `xxxxxxxxx` | Tawk.to → Property Settings |
| `NEXT_PUBLIC_SITE_URL` | `https://dbmart.ng` | Your domain |
| `CRON_SECRET` | `random-string-abc123` | You generate this |

3. **Add each variable TWICE** — once for **Production** and once for **Preview/Development**

---

## ⚠️ If npm install Fails Locally

Since npm is timing out on your machine, here's the fallback plan:

### Option A: Deploy to Vercel (Recommended)

Vercel's cloud build environment has no network issues and will install all dependencies automatically. Just push to GitHub and import on Vercel.

### Option B: Install Packages Individually (from smallest to largest)

If you must install locally, install packages one by one in this order:

```bash
# 1. Smallest utility packages first
npm install clsx
npm install tailwind-merge
npm install class-variance-authority
npm install zod
npm install date-fns
npm install sonner
npm install react-qr-code

# 2. Medium utility packages
npm install lucide-react
npm install react-hook-form @hookform/resolvers
npm install embla-carousel-react
npm install recharts

# 3. Animation & UI packages
npm install motion
npm install gsap @gsap/react
npm install lenis

# 4. 3D packages (largest)
npm install three @types/three
npm install @react-three/fiber @react-three/drei

# 5. Database & Auth
npm install @supabase/supabase-js @supabase/ssr

# 6. AI
npm install @google/generative-ai

# 7. Framework
npm install next react react-dom

# 8. Dev dependencies
npm install -D typescript @types/node @types/react @types/react-dom
npm install -D tailwindcss @tailwindcss/postcss @tailwindcss/typography postcss autoprefixer
npm install -D eslint eslint-config-next @eslint/eslintrc @eslint/js
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D vercel supabase
```

Each install should be faster since it's not resolving the full dependency tree at once.

### Option C: Use a Different Package Manager

```bash
# Install yarn
npm install -g yarn
yarn install

# Or install pnpm
npm install -g pnpm
pnpm install
```

---

## Post-Deployment Checklist

- [ ] Supabase migrations have been run in SQL Editor
- [ ] All 14 environment variables are set in Vercel
- [ ] Your email is in `admin_allowlist` Supabase table
- [ ] Paystack webhook URL is configured
- [ ] Custom domain DNS is pointed to Vercel
- [ ] GitHub Actions secrets are set (for cron/backup)
