# LinkedBoost AI — Personal Branding Agent

## Project Overview
- **Name**: LinkedBoost AI
- **Goal**: Automated LinkedIn personal branding agent with human-in-loop approval workflow
- **Platform**: Cloudflare Pages (Hono backend + Vanilla JS SPA frontend)

## Live URL
- **Sandbox**: https://3000-il8e4ggp479eoa94as21a-ecea8f22.sandbox.novita.ai

## Key Features

### 1. Smart Onboarding (4-Step Flow)
- LinkedIn profile connection (ID, name, headline, industry)
- Objective selection: Job Seeking | Network Building | C-Suite/Executive | Customer Acquisition | Funding/Investors
- Brand voice customization (tone, audience, expertise)
- AI strategy generation with animated progress

### 2. Personalized 12-Month Strategy
- Goal-specific KPIs and targets
- Content pillar breakdown with percentages
- Month-by-month execution roadmap with milestones
- Weekly action plan template
- Target personas for each objective

### 3. Dashboard Overview
- 6 live metrics: Followers, Profile Views, Impressions, Engagement Rate, Connections, Searches
- Weekly impressions bar chart (Chart.js)
- 12-month goal progress ring chart
- Today's execution task timeline
- Top performing posts list

### 4. Human-in-Loop Approval Center
- Pending approval queue with priority levels (High/Medium)
- Full content preview for each item
- AI scoring (0-100) for each piece of content
- Estimated reach and engagement predictions
- One-click Approve / Edit / Reject actions
- Approval stats dashboard

### 5. Content Queue & Calendar
- Weekly content calendar view (Mon-Sun)
- Scheduled content list with status badges
- Content types: Posts, Articles, Comments, Connection Requests, Reposts, DMs
- AI content score for each item
- Approve/Schedule controls

### 6. Automation Center
- 6 automation modules: Content Generation, Smart Connections, Engagement, Analytics, Outreach, Amplification
- Pause/Resume individual automations
- Automation stats: tasks completed, success rate, time saved
- Next run schedule for each module

### 7. Network Builder
- AI-recommended connections with relevance scores
- Personalized outreach message templates (Recruiter, Peer, Business Dev)
- Connection request management
- Network growth statistics

### 8. Strategy View
- Full strategy summary with KPIs
- 6-month roadmap with timeline
- Weekly action template by day

### 9. Deep Analytics
- 6 KPI cards with week-over-week comparison
- Follower growth line chart (12 weeks)
- Engagement by content type bar chart
- Audience insights: Industries, Seniority, Locations
- Top performing content list

### 10. Goals & Milestones
- Overall progress hero card (34% complete, Month 4 of 12)
- Milestone tracker timeline with completion status
- AI recommendations to accelerate goal achievement

## API Endpoints
- `POST /api/auth/connect` — Connect LinkedIn profile
- `POST /api/strategy/generate` — Generate personalized strategy
- `POST /api/content/generate` — Generate content batch
- `GET /api/content/queue` — Fetch content queue
- `POST /api/content/approve` — Approve/reject content
- `GET /api/analytics/overview` — Dashboard metrics
- `GET /api/analytics/goal-progress` — Goal progress data
- `GET /api/automation/schedule` — Today's tasks & schedule
- `POST /api/automation/run` — Trigger automation
- `GET /api/network/suggestions` — AI connection suggestions

## Tech Stack
- **Backend**: Hono framework (TypeScript) on Cloudflare Workers
- **Frontend**: Vanilla JavaScript SPA with TailwindCSS CDN
- **Charts**: Chart.js via CDN
- **HTTP**: Axios via CDN
- **Icons**: Font Awesome 6.5
- **Fonts**: Inter (Google Fonts)

## Objectives Supported
| Objective | Focus |
|-----------|-------|
| Job Seeking | Recruiter visibility, profile views, job opportunities |
| Network Building | Follower growth, engagement, community leadership |
| C-Suite/Executive | Thought leadership, media mentions, board visibility |
| Customer Acquisition | Lead generation, social selling, pipeline creation |
| Funding/Investors | VC connections, traction storytelling, warm intros |

## Deployment
- **Platform**: Cloudflare Pages
- **Status**: Active (sandbox)
- **Last Updated**: April 2025
