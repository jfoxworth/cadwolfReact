# Heroku Production Deployment Checklist

## 1. Heroku Config Vars

Set via `heroku config:set KEY=value` or the Heroku dashboard → Settings → Config Vars.

### Required (app will not boot without these)

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Auto-set by Heroku but confirm |
| `DATABASE_URL` | `postgres://...` | Same RDS URL used locally |
| `SESSION_SECRET` | 32+ random chars | Generate: `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.herokuapp.com` | Used in OAuth callbacks and email links |

### Email (SendGrid SMTP)

| Variable | Value |
|----------|-------|
| `MAIL_HOST` | `smtp.sendgrid.net` |
| `MAIL_USERNAME` | Same as `MAIL_USERNAME` in old Laravel app |
| `MAIL_PASSWORD` | Same as `MAIL_PASSWORD` in old Laravel app |
| `MAIL_FROM_EMAIL` | `noReply@cadwolf.com` |

### AWS S3 Storage

| Variable | Value |
|----------|-------|
| `AWS_ACCESS_KEY_ID` | IAM key |
| `AWS_SECRET_ACCESS_KEY` | IAM secret |
| `AWS_REGION` | `us-east-1` (or match bucket region) |
| `S3_BUCKET` | `cadwolf` (or production bucket name) |

### Stripe Payments

| Variable | Value |
|----------|-------|
| `STRIPE_SECRET_KEY` | `sk_test_...` (non-production fallback) |
| `STRIPE_LIVE_SECRET_KEY` | `sk_live_...` (used when NODE_ENV=production) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` |
| `NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY` | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from Stripe dashboard |
| `STRIPE_PRO_MONTHLY` | Stripe price ID |
| `STRIPE_PRO_YEARLY` | Stripe price ID |
| `STRIPE_BIZ_MONTHLY` | Stripe price ID |
| `STRIPE_BIZ_YEARLY` | Stripe price ID |

### OAuth Providers

| Variable | Notes |
|----------|-------|
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `FACEBOOK_CLIENT_ID` | From Meta Developer Console |
| `FACEBOOK_CLIENT_SECRET` | From Meta Developer Console |
| `ONSHAPE_CLIENT_ID` | From Onshape Dev Portal |
| `ONSHAPE_CLIENT_SECRET` | From Onshape Dev Portal |
| `FUSION_CLIENT_ID` | From Autodesk Forge |
| `FUSION_CLIENT_SECRET` | From Autodesk Forge |

### Optional

| Variable | Value |
|----------|-------|
| `ADMIN_EMAILS` | Comma-separated admin emails |
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 Measurement ID (e.g. `G-XXXXXXXXXX`) |

---

## 2. OAuth redirect URIs to update

In each provider's developer console, add the production callback URL:

| Provider | Redirect URI to add |
|----------|-------------------|
| Google | `https://your-app.herokuapp.com/api/auth/google/callback` |
| Facebook | `https://your-app.herokuapp.com/api/auth/facebook/callback` |
| Onshape | `https://your-app.herokuapp.com/api/auth/onshape/callback` |
| Fusion 360 | `https://your-app.herokuapp.com/api/auth/fusion/callback` |

---

## 3. Stripe webhook

In the Stripe dashboard → Webhooks → Add endpoint:
- URL: `https://your-app.herokuapp.com/api/webhook`
- Copy the signing secret → set as `STRIPE_WEBHOOK_SECRET`

---

## 4. Pre-launch checklist

- [ ] All required config vars set in Heroku dashboard
- [ ] OAuth redirect URIs updated in each provider console
- [ ] Stripe webhook endpoint registered with production URL
- [ ] Test login, register, and password reset flows after deploy
- [ ] Test Stripe checkout with a test card
