# LinkedBoost AI — Personal Branding Agent

## Project Overview
An AI-powered LinkedIn personal branding agent with subscription model. Analyzes LinkedIn profiles for free, then provides a paid automation dashboard for content generation, strategy planning, and network building.

## Live URLs
- **Sandbox**: https://3000-il8e4ggp479eoa94as21a-ecea8f22.sandbox.novita.ai
- **GitHub**: https://github.com/ekodecrux/linkdelngen

## Subscription Tiers
| Tier | Price | Features |
|------|-------|---------|
| **Free** | $0 | AI profile analysis, profile score, gaps, 5 quick wins |
| **Pro** | $29/mo | Strategy, content gen (30/mo), daily plans, approvals, network builder, analytics |
| **Enterprise** | $99/mo | Unlimited content, unlimited connections, white-glove onboarding |

## User Journey
1. **Landing** → paste LinkedIn URL → free AI analysis (no signup)
2. **Analysis Report** → profile score, gaps, competitor benchmark, quick wins (Groq AI)
3. **Upgrade Prompt** → choose Pro or Enterprise
4. **Auth** → SMS OTP (Twilio Verify) or Email OTP (Gmail SMTP)
5. **Objective Selection** → Job Search / Network Building / CXO / Customer Acquisition / Funding
6. **Strategy Generation** → Groq AI creates 12-month personalized roadmap
7. **Dashboard** → 8-tab automation hub with human-in-loop approvals

## Dashboard Modules
1. **Overview** — live metrics (followers, views, impressions, engagement, connections, search)
2. **Human Approvals** — review/approve/edit/reject AI-generated posts, connections, articles
3. **Content Queue** — scheduled posts with AI content scores
4. **12-Month Strategy** — AI roadmap with content pillars, monthly milestones, KPIs
5. **Daily Execution Plan** — AI-generated daily task list with automation flags
6. **Network Builder** — AI-curated connection targets with match scores
7. **Analytics** — 4 charts: follower growth, engagement trend, content type breakdown, goal radar
8. **AI Generate** — on-demand content generation (posts, articles, polls, stories, DMs)

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/analyze` | Free LinkedIn profile analysis via Groq AI |
| POST | `/api/auth/send-otp` | Send SMS OTP via Twilio Verify |
| POST | `/api/auth/verify-otp` | Verify SMS OTP |
| POST | `/api/auth/send-email-otp` | Send email OTP via Gmail SMTP |
| POST | `/api/strategy/generate` | Generate 12-month strategy (paid) |
| POST | `/api/content/generate` | Generate AI content (paid) |
| POST | `/api/execution/daily` | Get daily execution plan (paid) |
| GET | `/api/analytics/overview` | Dashboard metrics |
| GET | `/api/content/queue` | Content queue |
| GET | `/api/network/suggestions` | Network suggestions |

## Tech Stack
- **Backend**: Hono (TypeScript) on Cloudflare Workers/Pages
- **AI**: Groq API — `llama-3.3-70b-versatile`
- **SMS OTP**: Twilio Verify v2
- **Email**: Gmail SMTP (app password)
- **Frontend**: Vanilla JS + Tailwind CSS CDN + Chart.js + Axios
- **Build**: Vite + `@hono/vite-build`

## Environment Variables (.dev.vars)
```
GROQ_API_KEY=<your-groq-api-key>
TWILIO_ACCOUNT_SID=<your-twilio-account-sid>
TWILIO_AUTH_TOKEN=<your-twilio-auth-token>
TWILIO_SERVICE_SID=<your-twilio-verify-service-sid>
SMTP_EMAIL=<your-gmail-address>
SMTP_PASSWORD=<your-gmail-app-password>
JWT_SECRET=<random-secret-string>
```

## Deployment
- **Platform**: Cloudflare Pages
- **Status**: ✅ Active (sandbox)
- **Last Updated**: 2026-04-18
