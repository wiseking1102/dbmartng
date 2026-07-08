# DBMartNG — Deployment Guide

## Prerequisites

You need accounts with these services (all have free tiers):

| Service | Sign Up | Purpose |
|---------|---------|---------|
| **Vercel** | https://vercel.com | Hosting |
| **Supabase** | https://supabase.com | Database & Auth |
| **Paystack** | https://paystack.com | Payments |
| **Cloudflare** | https://dash.cloudflare.com | CAPTCHA (Turnstile) |
| **Resend** | https://resend.com | Transactional Email |
| **Google AI** | https://aistudio.google.com | AI Chat |
| **Tawk.to** | https://tawk.to | Live Chat (optional) |

## Step 1: Set up Supabase

1. Create a project at https://supabase.com
2. Go to **Project Settings → API** — copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`
3. Go to **SQL Editor** → run migrations in order:
   - `migrations/001_initial_schema.sql`
   - `migrations/002_social_activities.sql`
   - `migrations/003_add_referred_name.sql`
   - `migrations/004_seed_data.sql`

## Step 2: Set up Paystack

1. Create account at https://paystack.com
2. Go to **Settings → API Keys & Webhooks**:
   - Copy `Public key` → `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
   - Copy `Secret key` → `PAYSTACK_SECRET_KEY`
   - Set a webhook secret → `PAYSTACK_WEBHOOK_SECRET`
3. Configure webhook URL: `https://your-domain.vercel.app/api/webhooks/paystack`

## Step 3: Deploy to Vercel

```bash
# 1. Install dependencies
npm install

# 2. Run typecheck & build
npm run typecheck
npm run build

# 3. Link Vercel project (first time)
npx vercel link --yes

# 4. Set environment variables in Vercel dashboard
#    (all vars from .env.local.example)

# 5. Deploy
npx vercel deploy --prod --yes
```

Alternatively, connect your GitHub repo to Vercel:
1. Push code to GitHub
2. Go to https://vercel.com/new
3. Import your repo
4. Add all environment variables in the project settings
5. Deploy

## Step 4: Configure GitHub Secrets

Add these to your repo's **Settings → Secrets and variables → Actions**:

- `SUPABASE_SERVICE_ROLE_KEY` — for keep-alive & DB backup workflows
- `CRON_SECRET` — same value as in Vercel env vars
- `R2_ACCESS_KEY_ID` & `R2_SECRET_ACCESS_KEY` — for DB backup (Cloudflare R2)
- `R2_ENDPOINT` & `R2_BUCKET_NAME` — for DB backup storage

## Environment Variables

All 14 variables are documented in `.env.local.example`.

## Post-Deployment

1. **Add admin user**: Insert a record into `admin_allowlist` table in Supabase with your email
2. **Sign up** at `/auth` using that email — the admin setup flow will activate
3. **Verify Paystack webhook** by sending a test event from Paystack dashboard
4. **Test CAPTCHA** on `/careers` form submission

## Troubleshooting

- **Build fails with "Cannot find module"**: Run `npm install` to reinstall dependencies
- **API returns 401**: Check environment variables are set correctly in Vercel dashboard
- **Webhook not processing**: Verify webhook URL and secret in Paystack dashboard
- **TypeScript errors**: Run `npm run typecheck` and fix any reported issues
