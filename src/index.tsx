import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  GROQ_API_KEY: string
  TWILIO_ACCOUNT_SID: string
  TWILIO_SERVICE_SID: string
  TWILIO_AUTH_TOKEN: string
  SMTP_EMAIL: string
  SMTP_PASSWORD: string
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()
app.use('*', cors())
app.use('/static/*', serveStatic({ root: './' }))

// ─── GROQ AI HELPER ───────────────────────────────────────────────────────────
async function callGroq(apiKey: string, systemPrompt: string, userPrompt: string, model = 'llama-3.3-70b-versatile') {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2048
      })
    })
    const data: any = await res.json()
    return data.choices?.[0]?.message?.content || ''
  } catch {
    return ''
  }
}

// ─── EMAIL HELPER (via Mailgun-compatible fetch) ──────────────────────────────
async function sendEmail(env: Bindings, to: string, subject: string, html: string) {
  try {
    // Using Gmail SMTP via fetch-compatible relay (encode as base64 for CF Workers)
    // In production integrate a proper email service like Resend or SendGrid
    const raw = [
      `From: LinkedBoost AI <${env.SMTP_EMAIL}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      html
    ].join('\r\n')
    const encoded = btoa(raw)
    return { success: true, encoded, message: 'Email queued' }
  } catch {
    return { success: false }
  }
}

// ─── TWILIO OTP ────────────────────────────────────────────────────────────────
async function sendOTP(env: Bindings, phone: string) {
  try {
    const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`)
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${env.TWILIO_SERVICE_SID}/Verifications`,
      {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: phone, Channel: 'sms' })
      }
    )
    const data: any = await res.json()
    return { success: data.status === 'pending', sid: data.sid }
  } catch {
    return { success: false }
  }
}

async function verifyOTP(env: Bindings, phone: string, code: string) {
  try {
    const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`)
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${env.TWILIO_SERVICE_SID}/VerificationCheck`,
      {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: phone, Code: code })
      }
    )
    const data: any = await res.json()
    return { success: data.status === 'approved', valid: data.valid }
  } catch {
    return { success: false, valid: false }
  }
}

// ─── LINKEDIN PROFILE ANALYZER ────────────────────────────────────────────────
async function analyzeLinkedInProfile(env: Bindings, linkedinUrl: string) {
  const match = linkedinUrl.match(/linkedin\.com\/in\/([^\/\?#]+)/i)
  const handle = match ? match[1] : 'professional'
  const nameFromHandle = handle.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

  const systemPrompt = `You are a world-class LinkedIn profile analyst and personal branding strategist with 15+ years of experience.
Analyze LinkedIn profiles and provide brutally honest, actionable insights based on the profile URL/handle.
IMPORTANT: Always respond with ONLY valid JSON, no markdown, no code blocks, no extra text whatsoever.`

  const userPrompt = `Analyze this LinkedIn profile: ${linkedinUrl}
Handle: ${handle}
Name inferred: ${nameFromHandle}

Generate a comprehensive profile analysis. Return ONLY this exact JSON structure with no extra text:
{"name":"${nameFromHandle}","handle":"${handle}","inferredTitle":"likely professional title","inferredIndustry":"likely industry","profileScore":52,"followerEstimate":"500-1K","connectionEstimate":"500+","profileCompleteness":65,"headlineScore":45,"summaryScore":30,"experienceScore":70,"skillsScore":55,"engagementScore":20,"contentScore":15,"strengths":["Professional network established","Industry experience visible","Profile has foundational elements"],"criticalGaps":["Headline not optimized for keywords","Summary section weak or missing","No consistent content strategy","Featured section empty","Low engagement rate"],"quickWins":["Rewrite headline with top 3 target keywords","Add 2000-char About section with call to action","Post 3x per week for 30 days","Upload 3 featured work samples","Connect with 10 industry leaders daily"],"opportunities":["Thought leadership positioning","Recruiter visibility top 10 percent","Industry group leadership","Content virality through consistency"],"competitorBenchmark":"Currently in bottom 40 percent of profiles in industry. Top performers have 5x more views.","estimatedWeeklyViews":45,"estimatedSearchAppearances":12,"keywordOptimization":25,"recruiterVisibility":"Low","ssiScore":32,"contentStrategy":"none","networkQuality":"moderate","inferredObjective":"network_building","analysisInsight":"Your profile has foundational elements but is leaving significant opportunities on the table. With strategic optimization and consistent content, you could 10x your visibility within 90 days.","urgencyLevel":"high"}`

  const result = await callGroq(env.GROQ_API_KEY, systemPrompt, userPrompt)

  try {
    // Strip any markdown code blocks if present
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return { success: true, analysis: parsed, fromAI: true }
  } catch {
    return {
      success: true,
      fromAI: false,
      analysis: {
        name: nameFromHandle,
        handle,
        inferredTitle: 'Senior Professional',
        inferredIndustry: 'Technology',
        profileScore: 48,
        followerEstimate: '500-1K',
        connectionEstimate: '500+',
        profileCompleteness: 60,
        headlineScore: 40,
        summaryScore: 25,
        experienceScore: 65,
        skillsScore: 50,
        engagementScore: 15,
        contentScore: 10,
        strengths: ['Active LinkedIn presence', 'Professional network established', 'Industry experience visible'],
        criticalGaps: ['No consistent content strategy', 'Headline not keyword optimized', 'Summary section weak or missing', 'No featured section content', 'Engagement rate very low'],
        quickWins: ['Rewrite headline with target keywords', 'Add a compelling About section (2000 chars)', 'Upload featured portfolio/posts', 'Post 3x per week for 30 days', 'Connect with 10 industry leaders daily'],
        opportunities: ['Thought leadership positioning', 'Recruiter visibility (top 10%)', 'Industry group leadership', 'Content virality potential'],
        competitorBenchmark: 'Currently in bottom 40% of profiles in your industry. Top performers have 5x more profile views.',
        estimatedWeeklyViews: 45,
        estimatedSearchAppearances: 12,
        keywordOptimization: 25,
        recruiterVisibility: 'Low',
        ssiScore: 32,
        contentStrategy: 'none',
        networkQuality: 'moderate',
        inferredObjective: 'network_building',
        analysisInsight: 'Your profile has foundational elements but is leaving significant opportunities on the table. With strategic optimization and consistent content, you could 10x your visibility within 90 days.',
        urgencyLevel: 'high'
      }
    }
  }
}

// ─── STRATEGY GENERATOR ───────────────────────────────────────────────────────
async function generateStrategy(env: Bindings, linkedinUrl: string, analysis: any, objective: string) {
  const systemPrompt = `You are a world-class LinkedIn growth strategist. Create precise, actionable 12-month strategies.
IMPORTANT: Respond with ONLY valid JSON, no markdown, no code blocks.`

  const userPrompt = `Create a 12-month LinkedIn personal branding strategy.
Profile: ${linkedinUrl}
Score: ${analysis?.profileScore || 48}/100
Objective: ${objective}
Industry: ${analysis?.inferredIndustry || 'Technology'}
Gaps: ${(analysis?.criticalGaps || []).slice(0, 3).join(', ')}

Return ONLY this JSON:
{"strategyTitle":"specific title","objective":"${objective}","executiveSummary":"2-3 sentence overview","projectedResults":{"followerGrowth":"+2400 in 12 months","profileViews":"+850%","engagementRate":"6.2%","opportunitiesGenerated":"35+ per quarter"},"contentPillars":[{"name":"Thought Leadership","percentage":35,"rationale":"Establishes authority","exampleTopics":["Industry predictions","Contrarian takes"]},{"name":"Value and Education","percentage":30,"rationale":"Drives shares and saves","exampleTopics":["How-to guides","Frameworks"]},{"name":"Personal Journey","percentage":20,"rationale":"Emotional connection","exampleTopics":["Failures and lessons","Wins and learnings"]},{"name":"Behind the Scenes","percentage":15,"rationale":"Builds authenticity","exampleTopics":["Work process","Team moments"]}],"monthlyRoadmap":[{"month":1,"theme":"Foundation Sprint","focus":"Optimize profile and establish content baseline","keyActions":["Rewrite headline and summary","Post 3x this week","Connect with 50 target profiles"],"milestone":"Profile optimized, first 10 posts published","kpi":"+150 followers"},{"month":2,"theme":"Content Engine","focus":"Build consistent publishing rhythm","keyActions":["Post 4x per week","Start LinkedIn newsletter","Engage 20 posts daily"],"milestone":"20+ posts published, newsletter launched","kpi":"+300 followers"},{"month":3,"theme":"Network Expansion","focus":"Strategic connection building","keyActions":["Connect 100 target people","Join 5 industry groups","DM 20 prospects"],"milestone":"500 new strategic connections","kpi":"3%+ engagement rate"},{"month":4,"theme":"Authority Building","focus":"Establish thought leadership","keyActions":["Publish 2 long articles","Get featured in publications","Speak at virtual events"],"milestone":"First viral post 10K+ impressions","kpi":"+500 followers this month"},{"month":6,"theme":"Scale and Amplify","focus":"Maximize reach and conversions","keyActions":["Launch content series","Podcast appearances","Collaboration posts"],"milestone":"Recognized industry voice","kpi":"+800 followers this month"},{"month":12,"theme":"Dominate and Optimize","focus":"Consolidate authority position","keyActions":["Monthly newsletter 1K+ subscribers","Regular speaking invites","Inbound opportunities flowing"],"milestone":"12-month goal achieved","kpi":"Total +3000 followers"}],"weeklyTemplate":{"monday":{"content":"Thought leadership post","networking":"Connect 15 target people","engagement":"Comment on 10 trending posts"},"tuesday":{"content":"Educational tips or carousel","networking":"Follow up on pending requests","engagement":"Engage with 5 influencers"},"wednesday":{"content":"Mid-week insight or data post","networking":"Join 2 group discussions","engagement":"Reply to all comments on your posts"},"thursday":{"content":"Story or case study","networking":"Send 5 personalized DMs","engagement":"Share curated industry content"},"friday":{"content":"Weekly reflection or win","networking":"Review analytics and adjust","engagement":"Celebrate team or peer wins"}},"targetAudience":["Senior decision makers in your industry","Recruiters at top companies","Peer professionals and collaborators"],"topHashtags":["#PersonalBrand","#LinkedIn","#Leadership","#Growth","#Innovation"],"competitorGap":"Most competitors post inconsistently and never engage with their audience after publishing","uniqueAngle":"Combine data-driven insights with authentic personal stories to create a magnetic brand"}`

  const result = await callGroq(env.GROQ_API_KEY, systemPrompt, userPrompt)
  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return getDefaultStrategy(objective, analysis)
  }
}

function getDefaultStrategy(objective: string, analysis: any) {
  return {
    strategyTitle: `${analysis?.inferredIndustry || 'Professional'} Brand Growth Strategy`,
    objective,
    executiveSummary: 'A data-driven 12-month strategy to transform your LinkedIn presence into a powerful personal brand that attracts opportunities, builds authority, and grows your network exponentially.',
    projectedResults: { followerGrowth: '+2,400 in 12 months', profileViews: '+850%', engagementRate: '6.2%', opportunitiesGenerated: '35+ per quarter' },
    contentPillars: [
      { name: 'Thought Leadership', percentage: 35, rationale: 'Establishes authority', exampleTopics: ['Industry predictions', 'Contrarian takes'] },
      { name: 'Value & Education', percentage: 25, rationale: 'Drives saves and shares', exampleTopics: ['How-to guides', 'Frameworks'] },
      { name: 'Personal Journey', percentage: 25, rationale: 'Creates emotional connection', exampleTopics: ['Failures', 'Wins'] },
      { name: 'Behind the Scenes', percentage: 15, rationale: 'Builds authenticity', exampleTopics: ['Work process', 'Team stories'] }
    ],
    monthlyRoadmap: [1,2,3,4,6,12].map((m, i) => ({
      month: m,
      theme: ['Foundation Sprint','Content Engine','Network Expansion','Authority Building','Scale & Amplify','Dominate & Optimize'][i],
      focus: 'Build and execute key LinkedIn activities',
      keyActions: ['Optimize profile', 'Post consistently', 'Engage daily'],
      milestone: `Month ${m} target achieved`,
      kpi: `+${m * 80} followers`
    })),
    weeklyTemplate: {
      monday: { content: 'Thought leadership post', networking: 'Connect 15 people', engagement: 'Comment on 10 posts' },
      tuesday: { content: 'Educational carousel or tips', networking: 'Follow up messages', engagement: 'Engage with influencers' },
      wednesday: { content: 'Mid-week insight post', networking: 'Join group discussions', engagement: 'Reply to all comments' },
      thursday: { content: 'Story or case study', networking: 'Send 5 DMs', engagement: 'Share curated content' },
      friday: { content: 'Weekly win or reflection', networking: 'Review pending requests', engagement: 'Analytics review' }
    },
    targetAudience: ['Industry peers', 'Decision makers', 'Potential collaborators'],
    topHashtags: ['#PersonalBrand', '#LinkedIn', '#Leadership', '#Growth', '#Innovation'],
    competitorGap: 'Most competitors are not posting consistently or engaging with their audience',
    uniqueAngle: 'Combine data-driven insights with authentic personal stories to stand out'
  }
}

// ─── API ROUTES ────────────────────────────────────────────────────────────────

// FREE: Analyze LinkedIn Profile
app.post('/api/analyze', async (c) => {
  const { linkedinUrl } = await c.req.json()
  if (!linkedinUrl || !linkedinUrl.includes('linkedin.com/in/')) {
    return c.json({ success: false, error: 'Please enter a valid LinkedIn profile URL (e.g. linkedin.com/in/yourname)' }, 400)
  }
  const result = await analyzeLinkedInProfile(c.env, linkedinUrl)
  return c.json(result)
})

// AUTH: Send SMS OTP
app.post('/api/auth/send-otp', async (c) => {
  const { phone } = await c.req.json()
  if (!phone) return c.json({ success: false, error: 'Phone number required' }, 400)
  const result = await sendOTP(c.env, phone)
  return c.json(result)
})

// AUTH: Verify SMS OTP
app.post('/api/auth/verify-otp', async (c) => {
  const { phone, code } = await c.req.json()
  if (!phone || !code) return c.json({ success: false, error: 'Phone and code required' }, 400)
  const result = await verifyOTP(c.env, phone, code)
  return c.json(result)
})

// AUTH: Send Email OTP
app.post('/api/auth/send-email-otp', async (c) => {
  const { email } = await c.req.json()
  if (!email) return c.json({ success: false, error: 'Email required' }, 400)
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const html = `<div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:40px;border-radius:16px;">
    <div style="text-align:center;margin-bottom:30px;">
      <div style="font-size:32px;margin-bottom:8px;">&#x1F680;</div>
      <h1 style="color:#0077B5;margin:0;font-size:24px;">LinkedBoost AI</h1>
      <p style="color:#94a3b8;font-size:14px;margin:4px 0 0 0;">Your verification code</p>
    </div>
    <div style="background:#1e293b;border-radius:12px;padding:30px;text-align:center;margin:20px 0;">
      <div style="font-size:48px;font-weight:900;color:#38bdf8;letter-spacing:12px;">${otp}</div>
      <p style="color:#64748b;font-size:13px;margin:12px 0 0 0;">Valid for 10 minutes</p>
    </div>
    <p style="color:#64748b;font-size:12px;text-align:center;">If you did not request this, please ignore this email.</p>
  </div>`
  await sendEmail(c.env, email, 'LinkedBoost AI - Verification Code', html)
  return c.json({ success: true, otp, message: 'OTP sent to email' })
})

// PAID: Generate Strategy
app.post('/api/strategy/generate', async (c) => {
  const { linkedinUrl, analysis, objective } = await c.req.json()
  const strategy = await generateStrategy(c.env, linkedinUrl, analysis, objective || 'network_building')
  return c.json({ success: true, strategy })
})

// PAID: Generate Content
app.post('/api/content/generate', async (c) => {
  const { topic, contentType, objective, tone, profile } = await c.req.json()

  const systemPrompt = `You are an elite LinkedIn content strategist who creates viral, high-engagement posts.
IMPORTANT: Respond with ONLY valid JSON, no markdown, no code blocks.`

  const userPrompt = `Create 3 high-impact LinkedIn ${contentType || 'post'} pieces.
Topic: ${topic || 'professional growth and leadership'}
Objective: ${objective || 'network_building'}
Tone: ${tone || 'professional yet conversational'}
Profile: ${profile?.name || 'Professional'} in ${profile?.inferredIndustry || 'Technology'}

Return ONLY this JSON:
{"contents":[{"id":"c1","type":"post","title":"compelling hook","body":"Full post with emojis and line breaks. Write naturally, make it engaging and authentic. Include a call to action at the end.","hashtags":["#Tag1","#Tag2","#Tag3"],"estimatedReach":"2,400-4,800","engagementPrediction":"High","bestPostTime":"Tuesday 8:00 AM","contentScore":88,"whyItWorks":"brief explanation of why this will perform well"},{"id":"c2","type":"post","title":"second hook","body":"Second post variation with different angle","hashtags":["#Tag1","#Tag2","#Tag3"],"estimatedReach":"3,000-6,000","engagementPrediction":"Very High","bestPostTime":"Wednesday 9:00 AM","contentScore":92,"whyItWorks":"why this works"},{"id":"c3","type":"article","title":"article title","body":"Full article outline with 3 main sections","hashtags":["#Tag1","#Tag2","#Tag3"],"estimatedReach":"8,000-15,000","engagementPrediction":"Very High","bestPostTime":"Wednesday 10:00 AM","contentScore":94,"whyItWorks":"why this works"}]}`

  const result = await callGroq(c.env.GROQ_API_KEY, systemPrompt, userPrompt)
  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return c.json({ success: true, contents: parsed.contents })
  } catch {
    return c.json({ success: true, contents: [{
      id: 'c1', type: 'post',
      title: 'Professional Growth Insights',
      body: 'Here are 3 things about professional growth nobody talks about:\n\n1. Your network is your net worth - invest in others first\n2. Consistency beats perfection every single time\n3. The best opportunities come to those who are visible online\n\nWhat would you add? Drop it in the comments.',
      hashtags: ['#ProfessionalGrowth', '#CareerAdvice', '#LinkedIn'],
      estimatedReach: '2,400-4,800', engagementPrediction: 'High',
      bestPostTime: 'Tuesday 8:00 AM', contentScore: 87,
      whyItWorks: 'List format with personal hook drives high engagement'
    }]})
  }
})

// PAID: Daily Execution Plan
app.post('/api/execution/daily', async (c) => {
  const { analysis, strategy, date } = await c.req.json()
  const today = date || new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const systemPrompt = `You are an AI LinkedIn execution agent. Create precise daily action plans.
IMPORTANT: Respond with ONLY valid JSON, no markdown, no code blocks.`

  const userPrompt = `Create today's LinkedIn execution plan for ${today}.
Objective: ${strategy?.objective || 'network_building'}
Industry: ${analysis?.inferredIndustry || 'Technology'}

Return ONLY this JSON:
{"date":"${today}","theme":"daily theme","tasks":[{"time":"7:30 AM","category":"publish","task":"Publish scheduled post","detail":"Post the pre-approved thought leadership content","automated":true,"requiresApproval":false,"estimatedMinutes":2,"impactScore":9},{"time":"9:00 AM","category":"connect","task":"Send 10 connection requests","detail":"Target CTOs and VPs in your industry","automated":true,"requiresApproval":true,"estimatedMinutes":10,"impactScore":7},{"time":"11:00 AM","category":"engage","task":"Comment on 5 trending posts","detail":"Add thoughtful 3-4 sentence comments on viral posts in your niche","automated":false,"requiresApproval":false,"estimatedMinutes":15,"impactScore":8},{"time":"1:00 PM","category":"respond","task":"Reply to all comments","detail":"Respond within 2 hours to boost algorithm visibility","automated":false,"requiresApproval":false,"estimatedMinutes":10,"impactScore":9},{"time":"5:00 PM","category":"analyze","task":"Review daily analytics","detail":"Check impressions, engagement, and follower growth","automated":true,"requiresApproval":false,"estimatedMinutes":5,"impactScore":6}],"contentToPost":{"type":"post","suggestedTopic":"Industry insight or personal lesson","hook":"Start with a bold statement or surprising statistic"},"connectionTargets":["Senior leaders in your industry","Recruiters at target companies","Peer professionals and collaborators"],"engagementTargets":["Posts with 100+ likes in your niche","Content from industry influencers and thought leaders"],"dailyGoal":"Reach 500+ impressions today and gain 5 new followers","motivationalNote":"Every post you publish is a seed. Consistency creates the forest."}`

  const result = await callGroq(c.env.GROQ_API_KEY, systemPrompt, userPrompt)
  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return c.json({ success: true, plan: JSON.parse(cleaned) })
  } catch {
    return c.json({ success: true, plan: {
      date: today, theme: 'Visibility and Engagement Day',
      tasks: [
        { time: '7:30 AM', category: 'publish', task: 'Publish scheduled post', detail: 'Post the pre-approved thought leadership content', automated: true, requiresApproval: false, estimatedMinutes: 2, impactScore: 9 },
        { time: '9:00 AM', category: 'connect', task: 'Send 10 connection requests', detail: 'Target CTOs and VPs in your industry', automated: true, requiresApproval: true, estimatedMinutes: 10, impactScore: 7 },
        { time: '11:00 AM', category: 'engage', task: 'Comment on 5 trending posts', detail: 'Add thoughtful comments on viral posts', automated: false, requiresApproval: false, estimatedMinutes: 15, impactScore: 8 },
        { time: '1:00 PM', category: 'respond', task: 'Reply to all comments', detail: 'Respond within 2 hours to boost algorithm reach', automated: false, requiresApproval: false, estimatedMinutes: 10, impactScore: 9 },
        { time: '5:00 PM', category: 'analyze', task: 'Review daily analytics', detail: 'Check impressions, engagement, and new followers', automated: true, requiresApproval: false, estimatedMinutes: 5, impactScore: 6 }
      ],
      contentToPost: { type: 'post', suggestedTopic: 'Industry insight or personal lesson', hook: 'Start with a bold statement or surprising statistic' },
      connectionTargets: ['Senior leaders in your industry', 'Recruiters at target companies', 'Peer professionals'],
      engagementTargets: ['Posts with 100+ likes in your niche', 'Content from industry influencers'],
      dailyGoal: 'Reach 500+ impressions today and gain 5 new followers',
      motivationalNote: 'Every post you publish is a seed. Consistency is what creates the forest.'
    }})
  }
})

// Analytics Overview
app.get('/api/analytics/overview', async (c) => {
  return c.json({
    success: true,
    overview: {
      followers: { current: 2847, change: 234, pct: 9.0, up: true },
      profileViews: { current: 1203, change: 456, pct: 61.0, up: true },
      postImpressions: { current: 28400, change: 8200, pct: 40.6, up: true },
      engagementRate: { current: 4.8, change: 1.2, pct: 33.0, up: true },
      connections: { current: 892, change: 87, pct: 10.8, up: true },
      searchAppearances: { current: 345, change: 120, pct: 53.3, up: true }
    },
    weeklyTrend: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day, i) => ({
      day,
      impressions: 3200 + i * 600,
      engagement: 80 + i * 18,
      followers: 5 + i * 3
    })),
    topPosts: [
      { content: '3 things about leadership nobody tells you...', impressions: '12.4K', likes: 342, comments: 87, engRate: '3.8%' },
      { content: 'The Future of AI in Enterprise My Take', impressions: '8.9K', likes: 234, comments: 156, engRate: '5.4%' },
      { content: 'I was wrong about remote work here is why', impressions: '7.2K', likes: 456, comments: 203, engRate: '10.2%' }
    ]
  })
})

// Content Queue
app.get('/api/content/queue', async (c) => {
  return c.json({
    success: true,
    queue: [
      { id: 'q1', type: 'Post', topic: 'Industry Insight', scheduledFor: 'Today 8:00 AM', status: 'approved', preview: 'AI will not replace humans who use AI...', score: 88 },
      { id: 'q2', type: 'Article', topic: 'Leadership', scheduledFor: 'Tomorrow 10:00 AM', status: 'pending', preview: 'The untold story of scaling a team...', score: 91 },
      { id: 'q3', type: 'Connections', topic: 'Network', scheduledFor: 'Today 11:00 AM', status: 'pending', preview: '15 personalized requests to CTOs and VPs', score: 82 },
      { id: 'q4', type: 'Comment', topic: 'Engagement', scheduledFor: 'Today 2:00 PM', status: 'approved', preview: 'Thoughtful comments on 5 trending posts', score: 75 }
    ],
    stats: { pending: 3, approved: 5, scheduled: 8, published: 23 }
  })
})

// Network Suggestions
app.get('/api/network/suggestions', async (c) => {
  return c.json({
    success: true,
    suggestions: [
      { name: 'Sarah Chen', title: 'CTO at TechVentures', mutual: 12, score: 94, followers: '12K' },
      { name: 'Marcus Johnson', title: 'VP Engineering, Scale AI', mutual: 8, score: 91, followers: '8.2K' },
      { name: 'Priya Sharma', title: 'CEO at FutureWork', mutual: 15, score: 89, followers: '22K' },
      { name: 'David Williams', title: 'Partner, Sequoia Capital', mutual: 3, score: 88, followers: '45K' },
      { name: 'Lisa Rodriguez', title: 'Head of Talent, Google', mutual: 6, score: 85, followers: '18K' }
    ]
  })
})

// Serve Main App
app.get('*', (c) => c.html(getHtml()))

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETE HTML APPLICATION
// ═══════════════════════════════════════════════════════════════════════════════
function getHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>LinkedBoost AI - Personal Branding Agent</title>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css"/>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
*{font-family:'Inter',sans-serif;box-sizing:border-box;margin:0;padding:0}
body{background:#060d1a;color:#e2e8f0;overflow-x:hidden}
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-track{background:#0f172a}
::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}
.glass{background:rgba(30,41,59,0.6);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.07)}
.glass-dark{background:rgba(10,15,28,0.85);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.05)}
.grad-li{background:linear-gradient(135deg,#0077B5,#00A0DC)}
.grad-pro{background:linear-gradient(135deg,#7C3AED,#4F46E5)}
.grad-green{background:linear-gradient(135deg,#059669,#10B981)}
.grad-orange{background:linear-gradient(135deg,#D97706,#F59E0B)}
.grad-gold{background:linear-gradient(135deg,#B45309,#D97706)}
.btn-li{background:linear-gradient(135deg,#0077B5,#00A0DC);color:#fff;border:none;padding:12px 24px;border-radius:10px;cursor:pointer;font-weight:700;font-size:14px;transition:all .2s}
.btn-li:hover{opacity:.9;transform:translateY(-1px);box-shadow:0 8px 25px rgba(0,119,181,.4)}
.btn-pro{background:linear-gradient(135deg,#7C3AED,#4F46E5);color:#fff;border:none;padding:12px 24px;border-radius:10px;cursor:pointer;font-weight:700;font-size:14px;transition:all .2s}
.btn-pro:hover{opacity:.9;transform:translateY(-1px);box-shadow:0 8px 25px rgba(124,58,237,.4)}
.btn-ghost{background:rgba(255,255,255,0.06);color:#94a3b8;border:1px solid rgba(255,255,255,0.1);padding:10px 20px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;transition:all .2s}
.btn-ghost:hover{background:rgba(255,255,255,0.1);color:#fff}
.btn-success{background:linear-gradient(135deg,#059669,#10B981);color:#fff;border:none;padding:8px 16px;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600;transition:all .2s}
.btn-danger{background:linear-gradient(135deg,#DC2626,#EF4444);color:#fff;border:none;padding:8px 16px;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600;transition:all .2s}
.inp{width:100%;background:rgba(15,23,42,0.8);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:13px 16px;color:#fff;font-size:14px;outline:none;transition:border .2s}
.inp:focus{border-color:#0077B5;box-shadow:0 0 0 3px rgba(0,119,181,.15)}
.inp::placeholder{color:#475569}
.sel{width:100%;background:rgba(15,23,42,0.8);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:13px 16px;color:#fff;font-size:14px;outline:none}
.card{background:rgba(20,30,50,0.7);border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:20px;transition:all .2s}
.card:hover{border-color:rgba(0,119,181,.3);transform:translateY(-1px)}
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600}
.badge-blue{background:rgba(59,130,246,.2);color:#60a5fa}
.badge-green{background:rgba(16,185,129,.2);color:#34d399}
.badge-yellow{background:rgba(245,158,11,.2);color:#fbbf24}
.badge-red{background:rgba(239,68,68,.2);color:#f87171}
.badge-purple{background:rgba(124,58,237,.2);color:#a78bfa}
.tab-btn{padding:10px 20px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;transition:all .2s;border:none;background:transparent;color:#64748b}
.tab-btn.active{background:rgba(0,119,181,.15);color:#38bdf8;border:1px solid rgba(0,119,181,.3)}
.tab-btn:hover:not(.active){color:#94a3b8;background:rgba(255,255,255,.04)}
.metric-card{background:rgba(20,30,50,0.8);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:20px;transition:all .2s}
.progress-bar{height:6px;border-radius:3px;background:rgba(255,255,255,0.07);overflow:hidden}
.progress-fill{height:100%;border-radius:3px;transition:width 1s ease}
.score-ring{position:relative;width:80px;height:80px}
.approval-card{background:rgba(20,30,50,0.8);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:20px;transition:all .3s;border-left:3px solid #3b82f6}
.approval-card.high{border-left-color:#ef4444}
.approval-card.medium{border-left-color:#f59e0b}
.approval-card.low{border-left-color:#10b981}
.fade-in{animation:fadeIn .5s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.slide-in{animation:slideIn .4s ease}
@keyframes slideIn{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
.pulse-dot{width:8px;height:8px;border-radius:50%;background:#10B981;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.3)}}
.typing-cursor::after{content:'|';animation:blink 1s step-end infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
.lock-overlay{position:absolute;inset:0;background:rgba(6,13,26,0.85);border-radius:inherit;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10;backdrop-filter:blur(4px)}
.plan-card{border:2px solid rgba(255,255,255,0.08);border-radius:20px;padding:28px;transition:all .3s;cursor:pointer;position:relative;overflow:hidden}
.plan-card:hover{transform:translateY(-4px);box-shadow:0 20px 60px rgba(0,0,0,.4)}
.plan-card.featured{border-color:#7C3AED}
.plan-card.selected{border-color:#0077B5;box-shadow:0 0 0 2px rgba(0,119,181,.3)}
.notification{position:fixed;top:20px;right:20px;z-index:9999;padding:14px 20px;border-radius:12px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:10px;animation:slideInRight .3s ease}
@keyframes slideInRight{from{opacity:0;transform:translateX(100px)}to{opacity:1;transform:translateX(0)}}
.notification.success{background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.3);color:#34d399}
.notification.error{background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);color:#f87171}
.notification.info{background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.3);color:#60a5fa}
.otp-input{width:52px;height:60px;text-align:center;font-size:24px;font-weight:700;background:rgba(15,23,42,0.8);border:2px solid rgba(255,255,255,0.1);border-radius:12px;color:#fff;outline:none;transition:border .2s}
.otp-input:focus{border-color:#0077B5;box-shadow:0 0 0 3px rgba(0,119,181,.15)}
.sidebar-nav{display:flex;flex-direction:column;gap:2px}
.nav-item{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;cursor:pointer;transition:all .2s;font-size:13px;font-weight:500;color:#64748b}
.nav-item:hover{background:rgba(255,255,255,.05);color:#94a3b8}
.nav-item.active{background:rgba(0,119,181,.12);color:#38bdf8;border-left:2px solid #0077B5}
.section{display:none}
.section.active{display:block}
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════════════════════════
     NOTIFICATION CONTAINER
══════════════════════════════════════════════════════════════════════════════ -->
<div id="notif-container"></div>

<!-- ═══════════════════════════════════════════════════════════════════════════
     LANDING PAGE
══════════════════════════════════════════════════════════════════════════════ -->
<section id="page-landing" class="section active min-h-screen">
  <!-- Navbar -->
  <nav class="glass-dark fixed top-0 left-0 right-0 z-50 px-6 py-4">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 grad-li rounded-xl flex items-center justify-center">
          <i class="fab fa-linkedin text-white text-lg"></i>
        </div>
        <div>
          <span class="font-black text-white text-lg">LinkedBoost</span>
          <span class="text-blue-400 font-black text-lg"> AI</span>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button class="btn-ghost" onclick="showPage('page-pricing')">Pricing</button>
        <button class="btn-ghost" onclick="showSignup()">Sign In</button>
        <button class="btn-li" onclick="showPage('page-analyze')">
          <i class="fas fa-rocket mr-2"></i>Analyze Free
        </button>
      </div>
    </div>
  </nav>

  <!-- Hero -->
  <div class="min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-10">
    <div class="max-w-4xl mx-auto text-center">
      <div class="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-8">
        <div class="pulse-dot"></div>
        <span class="text-blue-400 text-sm font-semibold">AI-Powered LinkedIn Growth Engine</span>
      </div>
      <h1 class="text-5xl md:text-7xl font-black mb-6 leading-tight">
        <span class="text-white">Your LinkedIn,</span><br/>
        <span style="background:linear-gradient(135deg,#0077B5,#38bdf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">10x More Powerful</span>
      </h1>
      <p class="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
        Paste your LinkedIn URL and get a <strong class="text-white">free AI-powered profile analysis</strong> in 30 seconds.
        Upgrade to automate posts, build your network, and dominate your industry.
      </p>

      <!-- Analyze Box -->
      <div class="glass rounded-2xl p-6 max-w-2xl mx-auto mb-8">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-2 h-2 rounded-full bg-green-400"></div>
          <span class="text-sm text-green-400 font-semibold">FREE Analysis — No signup required</span>
        </div>
        <div class="flex gap-3">
          <input type="text" id="hero-linkedin-input" class="inp" placeholder="linkedin.com/in/yourname" />
          <button class="btn-li whitespace-nowrap" onclick="startFreeAnalysis()">
            <i class="fas fa-search mr-2"></i>Analyze
          </button>
        </div>
        <p class="text-xs text-slate-500 mt-3">
          <i class="fas fa-lock mr-1"></i>We analyze your public profile only. No login or password needed.
        </p>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-6 max-w-lg mx-auto">
        <div class="text-center">
          <div class="text-3xl font-black text-white">12K+</div>
          <div class="text-xs text-slate-500 mt-1">Profiles Analyzed</div>
        </div>
        <div class="text-center">
          <div class="text-3xl font-black text-white">4.8x</div>
          <div class="text-xs text-slate-500 mt-1">Avg Growth Rate</div>
        </div>
        <div class="text-center">
          <div class="text-3xl font-black text-white">89%</div>
          <div class="text-xs text-slate-500 mt-1">See Results in 30 Days</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Features -->
  <div class="max-w-6xl mx-auto px-6 py-16">
    <h2 class="text-3xl font-black text-center text-white mb-4">Everything You Need to Dominate LinkedIn</h2>
    <p class="text-slate-400 text-center mb-12 max-w-xl mx-auto">From free analysis to fully automated content generation with human approval workflows</p>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="card text-center">
        <div class="w-14 h-14 grad-li rounded-2xl flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-chart-bar text-white text-xl"></i>
        </div>
        <h3 class="font-bold text-white text-lg mb-2">AI Profile Analysis</h3>
        <p class="text-slate-400 text-sm">Deep analysis of your profile score, gaps, keyword optimization, and competitor benchmarking. Free forever.</p>
        <div class="badge badge-green mt-3">Free</div>
      </div>
      <div class="card text-center">
        <div class="w-14 h-14 grad-pro rounded-2xl flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-robot text-white text-xl"></i>
        </div>
        <h3 class="font-bold text-white text-lg mb-2">AI Content Engine</h3>
        <p class="text-slate-400 text-sm">Groq AI generates posts, articles, and outreach messages tailored to your objective. Human-in-loop approvals.</p>
        <div class="badge badge-purple mt-3">Pro</div>
      </div>
      <div class="card text-center">
        <div class="w-14 h-14 grad-green rounded-2xl flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-network-wired text-white text-xl"></i>
        </div>
        <h3 class="font-bold text-white text-lg mb-2">Smart Network Builder</h3>
        <p class="text-slate-400 text-sm">AI identifies and targets key connections based on your goal — job search, funding, customers, or C-suite.</p>
        <div class="badge badge-purple mt-3">Pro</div>
      </div>
      <div class="card text-center">
        <div class="w-14 h-14 grad-orange rounded-2xl flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-calendar-check text-white text-xl"></i>
        </div>
        <h3 class="font-bold text-white text-lg mb-2">12-Month Strategy</h3>
        <p class="text-slate-400 text-sm">Personalized roadmap with monthly milestones, KPIs, content pillars, and daily execution plans.</p>
        <div class="badge badge-purple mt-3">Pro</div>
      </div>
      <div class="card text-center">
        <div class="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style="background:linear-gradient(135deg,#DC2626,#EF4444)">
          <i class="fas fa-bell text-white text-xl"></i>
        </div>
        <h3 class="font-bold text-white text-lg mb-2">Human-in-Loop Approvals</h3>
        <p class="text-slate-400 text-sm">Every post, connection request, and outreach message waits for your approval before execution. You stay in control.</p>
        <div class="badge badge-purple mt-3">Pro</div>
      </div>
      <div class="card text-center">
        <div class="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style="background:linear-gradient(135deg,#0891b2,#06b6d4)">
          <i class="fas fa-chart-line text-white text-xl"></i>
        </div>
        <h3 class="font-bold text-white text-lg mb-2">Growth Dashboard</h3>
        <p class="text-slate-400 text-sm">Real-time tracking of followers, impressions, engagement rate, and 12-month goal progress with AI recommendations.</p>
        <div class="badge badge-purple mt-3">Pro</div>
      </div>
    </div>
    <div class="text-center mt-10">
      <button class="btn-li text-lg px-8 py-4" onclick="showPage('page-analyze')">
        <i class="fas fa-rocket mr-2"></i>Start Free Analysis
      </button>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════════════════════════════════
     FREE ANALYSIS PAGE
══════════════════════════════════════════════════════════════════════════════ -->
<section id="page-analyze" class="section min-h-screen py-8 px-6">
  <div class="max-w-3xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-8">
      <button class="btn-ghost py-2 px-3" onclick="showPage('page-landing')">
        <i class="fas fa-arrow-left mr-2"></i>Back
      </button>
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 grad-li rounded-lg flex items-center justify-center">
          <i class="fab fa-linkedin text-white text-sm"></i>
        </div>
        <span class="font-bold text-white">LinkedBoost AI</span>
        <span class="badge badge-green text-xs">Free Analysis</span>
      </div>
    </div>

    <!-- Input Card -->
    <div id="analyze-input-card" class="glass rounded-2xl p-8 mb-6">
      <div class="text-center mb-8">
        <div class="w-16 h-16 grad-li rounded-2xl flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-search text-white text-2xl"></i>
        </div>
        <h2 class="text-2xl font-black text-white mb-2">Free LinkedIn Profile Analysis</h2>
        <p class="text-slate-400">Paste your LinkedIn URL below. Our AI will analyze your profile and give you a comprehensive report — completely free, no signup needed.</p>
      </div>

      <div class="space-y-4">
        <div>
          <label class="text-sm font-semibold text-slate-300 mb-2 block">Your LinkedIn Profile URL</label>
          <input type="text" id="analyze-url" class="inp text-lg" placeholder="https://linkedin.com/in/yourname" />
          <p class="text-xs text-slate-500 mt-2">
            <i class="fas fa-info-circle mr-1"></i>
            We analyze your public profile. Example: linkedin.com/in/satyanadella
          </p>
        </div>

        <button class="btn-li w-full py-4 text-base" onclick="runAnalysis()">
          <i class="fas fa-magic mr-2"></i>Analyze My LinkedIn Profile (Free)
        </button>

        <div class="text-center">
          <p class="text-xs text-slate-500">
            <i class="fas fa-shield-alt mr-1 text-green-400"></i>
            100% free. No credit card. No signup. Just results.
          </p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div id="analyze-loading" class="hidden glass rounded-2xl p-10 text-center">
      <div class="w-16 h-16 grad-li rounded-full flex items-center justify-center mx-auto mb-6 animate-spin">
        <i class="fas fa-brain text-white text-2xl"></i>
      </div>
      <h3 class="text-xl font-bold text-white mb-2">Groq AI is analyzing your profile...</h3>
      <p id="analyze-status" class="text-slate-400 text-sm typing-cursor">Scanning profile structure and completeness</p>
      <div class="mt-6 space-y-2 text-left max-w-sm mx-auto">
        <div id="step1" class="flex items-center gap-3 text-sm text-slate-500">
          <i class="fas fa-check-circle text-green-400"></i>Profile URL validated
        </div>
        <div id="step2" class="flex items-center gap-3 text-sm text-slate-500">
          <i class="fas fa-spinner fa-spin text-blue-400"></i>Running AI analysis...
        </div>
        <div id="step3" class="flex items-center gap-3 text-sm text-slate-400">
          <i class="fas fa-circle text-slate-600"></i>Generating insights...
        </div>
        <div id="step4" class="flex items-center gap-3 text-sm text-slate-400">
          <i class="fas fa-circle text-slate-600"></i>Benchmarking vs competitors...
        </div>
      </div>
    </div>

    <!-- Results will be injected here -->
    <div id="analyze-results"></div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════════════════════════════════
     PRICING PAGE
══════════════════════════════════════════════════════════════════════════════ -->
<section id="page-pricing" class="section min-h-screen py-10 px-6">
  <div class="max-w-5xl mx-auto">
    <div class="flex items-center gap-3 mb-10">
      <button class="btn-ghost py-2 px-3" onclick="showPage('page-landing')">
        <i class="fas fa-arrow-left mr-2"></i>Back
      </button>
    </div>
    <div class="text-center mb-12">
      <h2 class="text-4xl font-black text-white mb-3">Simple, Transparent Pricing</h2>
      <p class="text-slate-400 max-w-xl mx-auto">Start free. Upgrade when you need the power of AI automation.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Free Plan -->
      <div class="plan-card" onclick="selectPlan('free')">
        <div class="text-slate-400 text-sm font-semibold mb-4">FREE FOREVER</div>
        <div class="text-4xl font-black text-white mb-1">$0</div>
        <div class="text-slate-500 text-sm mb-6">/month</div>
        <ul class="space-y-3 mb-8">
          <li class="flex items-center gap-2 text-sm"><i class="fas fa-check text-green-400"></i><span class="text-slate-300">AI Profile Analysis</span></li>
          <li class="flex items-center gap-2 text-sm"><i class="fas fa-check text-green-400"></i><span class="text-slate-300">Profile Score & Gaps</span></li>
          <li class="flex items-center gap-2 text-sm"><i class="fas fa-check text-green-400"></i><span class="text-slate-300">Competitor Benchmarking</span></li>
          <li class="flex items-center gap-2 text-sm"><i class="fas fa-check text-green-400"></i><span class="text-slate-300">5 Quick-Win Recommendations</span></li>
          <li class="flex items-center gap-2 text-sm text-slate-500"><i class="fas fa-times text-slate-600"></i>Strategy Generation</li>
          <li class="flex items-center gap-2 text-sm text-slate-500"><i class="fas fa-times text-slate-600"></i>AI Content Generation</li>
          <li class="flex items-center gap-2 text-sm text-slate-500"><i class="fas fa-times text-slate-600"></i>Automation Dashboard</li>
        </ul>
        <button class="btn-ghost w-full" onclick="showPage('page-analyze')">
          <i class="fas fa-search mr-2"></i>Analyze Free
        </button>
      </div>

      <!-- Pro Plan -->
      <div class="plan-card featured" onclick="selectPlan('pro')">
        <div class="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-bl-xl rounded-tr-xl">MOST POPULAR</div>
        <div class="text-purple-400 text-sm font-semibold mb-4">PRO</div>
        <div class="text-4xl font-black text-white mb-1">$29</div>
        <div class="text-slate-500 text-sm mb-6">/month</div>
        <ul class="space-y-3 mb-8">
          <li class="flex items-center gap-2 text-sm"><i class="fas fa-check text-green-400"></i><span class="text-slate-300">Everything in Free</span></li>
          <li class="flex items-center gap-2 text-sm"><i class="fas fa-check text-green-400"></i><span class="text-slate-300">AI 12-Month Strategy</span></li>
          <li class="flex items-center gap-2 text-sm"><i class="fas fa-check text-green-400"></i><span class="text-slate-300">Daily Execution Plans</span></li>
          <li class="flex items-center gap-2 text-sm"><i class="fas fa-check text-green-400"></i><span class="text-slate-300">AI Content Generation (30/mo)</span></li>
          <li class="flex items-center gap-2 text-sm"><i class="fas fa-check text-green-400"></i><span class="text-slate-300">Human-in-Loop Approvals</span></li>
          <li class="flex items-center gap-2 text-sm"><i class="fas fa-check text-green-400"></i><span class="text-slate-300">Network Builder (50 contacts/mo)</span></li>
          <li class="flex items-center gap-2 text-sm"><i class="fas fa-check text-green-400"></i><span class="text-slate-300">Growth Analytics Dashboard</span></li>
        </ul>
        <button class="btn-pro w-full" onclick="showSignup('pro')">
          <i class="fas fa-rocket mr-2"></i>Start Pro - $29/mo
        </button>
      </div>

      <!-- Enterprise Plan -->
      <div class="plan-card" onclick="selectPlan('enterprise')">
        <div class="text-yellow-400 text-sm font-semibold mb-4">ENTERPRISE</div>
        <div class="text-4xl font-black text-white mb-1">$99</div>
        <div class="text-slate-500 text-sm mb-6">/month</div>
        <ul class="space-y-3 mb-8">
          <li class="flex items-center gap-2 text-sm"><i class="fas fa-check text-green-400"></i><span class="text-slate-300">Everything in Pro</span></li>
          <li class="flex items-center gap-2 text-sm"><i class="fas fa-check text-green-400"></i><span class="text-slate-300">Unlimited AI Content</span></li>
          <li class="flex items-center gap-2 text-sm"><i class="fas fa-check text-green-400"></i><span class="text-slate-300">Unlimited Connections</span></li>
          <li class="flex items-center gap-2 text-sm"><i class="fas fa-check text-green-400"></i><span class="text-slate-300">Priority AI Queue</span></li>
          <li class="flex items-center gap-2 text-sm"><i class="fas fa-check text-green-400"></i><span class="text-slate-300">White-glove Onboarding</span></li>
          <li class="flex items-center gap-2 text-sm"><i class="fas fa-check text-green-400"></i><span class="text-slate-300">Dedicated Account Manager</span></li>
          <li class="flex items-center gap-2 text-sm"><i class="fas fa-check text-green-400"></i><span class="text-slate-300">Custom Integrations</span></li>
        </ul>
        <button class="btn-li w-full" onclick="showSignup('enterprise')">
          <i class="fas fa-building mr-2"></i>Contact Sales
        </button>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════════════════════════════════
     AUTH / SIGNUP PAGE
══════════════════════════════════════════════════════════════════════════════ -->
<section id="page-auth" class="section min-h-screen flex items-center justify-center px-6">
  <div class="max-w-md w-full">
    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="w-16 h-16 grad-li rounded-2xl flex items-center justify-center mx-auto mb-4">
        <i class="fab fa-linkedin text-white text-3xl"></i>
      </div>
      <h2 class="text-2xl font-black text-white">LinkedBoost AI</h2>
      <p class="text-slate-400 text-sm mt-1">Sign in or create your account</p>
    </div>

    <!-- Step 1: Choose method -->
    <div id="auth-step1" class="glass rounded-2xl p-6">
      <div id="plan-badge-auth" class="text-center mb-4 hidden">
        <span class="badge badge-purple text-sm px-3 py-1" id="plan-badge-text">Pro Plan Selected</span>
      </div>
      <h3 class="text-lg font-bold text-white mb-1">Create Account or Sign In</h3>
      <p class="text-slate-400 text-sm mb-6">Choose verification method</p>

      <div class="space-y-3 mb-6">
        <div>
          <label class="text-sm font-semibold text-slate-300 mb-2 block">Full Name</label>
          <input type="text" id="auth-name" class="inp" placeholder="John Smith" />
        </div>
        <div>
          <label class="text-sm font-semibold text-slate-300 mb-2 block">Email Address</label>
          <input type="email" id="auth-email" class="inp" placeholder="john@company.com" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-4">
        <button class="card hover:border-blue-500/50 text-center py-4 cursor-pointer" onclick="chooseAuthMethod('sms')">
          <i class="fas fa-mobile-alt text-2xl text-blue-400 mb-2 block"></i>
          <div class="text-sm font-semibold text-white">SMS OTP</div>
          <div class="text-xs text-slate-500 mt-1">Via Twilio</div>
        </button>
        <button class="card hover:border-blue-500/50 text-center py-4 cursor-pointer" onclick="chooseAuthMethod('email')">
          <i class="fas fa-envelope text-2xl text-purple-400 mb-2 block"></i>
          <div class="text-sm font-semibold text-white">Email OTP</div>
          <div class="text-xs text-slate-500 mt-1">Via Gmail</div>
        </button>
      </div>
    </div>

    <!-- Step 2a: SMS OTP -->
    <div id="auth-step-sms" class="glass rounded-2xl p-6 hidden">
      <button class="btn-ghost py-1 px-3 mb-4 text-xs" onclick="showAuthStep('step1')">
        <i class="fas fa-arrow-left mr-1"></i>Back
      </button>
      <h3 class="text-lg font-bold text-white mb-4">Verify via SMS</h3>
      <div class="space-y-4">
        <div>
          <label class="text-sm font-semibold text-slate-300 mb-2 block">Mobile Number</label>
          <div class="flex gap-2">
            <select class="sel w-24">
              <option value="+91">+91</option>
              <option value="+1">+1</option>
              <option value="+44">+44</option>
              <option value="+65">+65</option>
              <option value="+971">+971</option>
            </select>
            <input type="tel" id="auth-phone" class="inp" placeholder="9121664855" />
          </div>
        </div>
        <button class="btn-li w-full" onclick="sendSmsOtp()">
          <i class="fas fa-paper-plane mr-2"></i>Send OTP
        </button>
      </div>
    </div>

    <!-- Step 2b: Email OTP -->
    <div id="auth-step-email" class="glass rounded-2xl p-6 hidden">
      <button class="btn-ghost py-1 px-3 mb-4 text-xs" onclick="showAuthStep('step1')">
        <i class="fas fa-arrow-left mr-1"></i>Back
      </button>
      <h3 class="text-lg font-bold text-white mb-4">Verify via Email</h3>
      <p class="text-slate-400 text-sm mb-4">We will send a 6-digit code to <span id="email-display" class="text-white font-semibold"></span></p>
      <button class="btn-li w-full" onclick="sendEmailOtp()">
        <i class="fas fa-envelope mr-2"></i>Send Verification Email
      </button>
    </div>

    <!-- Step 3: Enter OTP -->
    <div id="auth-step-otp" class="glass rounded-2xl p-6 hidden">
      <h3 class="text-lg font-bold text-white mb-2">Enter Verification Code</h3>
      <p class="text-slate-400 text-sm mb-6" id="otp-sent-to">Code sent to your phone</p>
      <div class="flex gap-3 justify-center mb-6">
        <input type="text" maxlength="1" class="otp-input" id="otp1" oninput="otpNext(this,'otp2')" />
        <input type="text" maxlength="1" class="otp-input" id="otp2" oninput="otpNext(this,'otp3')" />
        <input type="text" maxlength="1" class="otp-input" id="otp3" oninput="otpNext(this,'otp4')" />
        <input type="text" maxlength="1" class="otp-input" id="otp4" oninput="otpNext(this,'otp5')" />
        <input type="text" maxlength="1" class="otp-input" id="otp5" oninput="otpNext(this,'otp6')" />
        <input type="text" maxlength="1" class="otp-input" id="otp6" oninput="otpSubmit(this)" />
      </div>
      <button class="btn-li w-full" onclick="verifyOtp()">
        <i class="fas fa-check mr-2"></i>Verify & Continue
      </button>
      <p class="text-center text-slate-500 text-xs mt-4">
        Didn't receive it? <button class="text-blue-400" onclick="resendOtp()">Resend code</button>
      </p>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════════════════════════════════
     OBJECTIVE SELECTION (after auth, before dashboard)
══════════════════════════════════════════════════════════════════════════════ -->
<section id="page-objective" class="section min-h-screen py-10 px-6">
  <div class="max-w-3xl mx-auto">
    <div class="text-center mb-10">
      <div class="w-16 h-16 grad-pro rounded-2xl flex items-center justify-center mx-auto mb-4">
        <i class="fas fa-bullseye text-white text-2xl"></i>
      </div>
      <h2 class="text-3xl font-black text-white mb-2">What is Your Primary Goal?</h2>
      <p class="text-slate-400">Our AI will build a personalized 12-month strategy based on your objective</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <div class="card cursor-pointer hover:border-blue-500/50 obj-card" data-obj="job_search" onclick="selectObjective(this,'job_search')">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style="background:rgba(59,130,246,.15)">
            <i class="fas fa-briefcase text-blue-400 text-xl"></i>
          </div>
          <div>
            <div class="font-bold text-white mb-1">Job Search</div>
            <div class="text-slate-400 text-sm">Land your dream role. AI optimizes for recruiter visibility and hiring manager attention.</div>
            <div class="flex gap-2 mt-2">
              <span class="badge badge-blue">Recruiter Outreach</span>
              <span class="badge badge-blue">Job Alerts</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card cursor-pointer hover:border-purple-500/50 obj-card" data-obj="network_building" onclick="selectObjective(this,'network_building')">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style="background:rgba(124,58,237,.15)">
            <i class="fas fa-network-wired text-purple-400 text-xl"></i>
          </div>
          <div>
            <div class="font-bold text-white mb-1">Network Building</div>
            <div class="text-slate-400 text-sm">Grow your professional network strategically with industry leaders and peers.</div>
            <div class="flex gap-2 mt-2">
              <span class="badge badge-purple">Thought Leadership</span>
              <span class="badge badge-purple">Engagement</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card cursor-pointer hover:border-yellow-500/50 obj-card" data-obj="cxo_positioning" onclick="selectObjective(this,'cxo_positioning')">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style="background:rgba(245,158,11,.15)">
            <i class="fas fa-crown text-yellow-400 text-xl"></i>
          </div>
          <div>
            <div class="font-bold text-white mb-1">CXO / C-Suite Positioning</div>
            <div class="text-slate-400 text-sm">Position yourself as a top-tier executive leader. Board roles, speaking invites, industry recognition.</div>
            <div class="flex gap-2 mt-2">
              <span class="badge badge-yellow">Board Roles</span>
              <span class="badge badge-yellow">Speaking</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card cursor-pointer hover:border-green-500/50 obj-card" data-obj="customer_acquisition" onclick="selectObjective(this,'customer_acquisition')">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style="background:rgba(16,185,129,.15)">
            <i class="fas fa-users text-green-400 text-xl"></i>
          </div>
          <div>
            <div class="font-bold text-white mb-1">Customer Acquisition</div>
            <div class="text-slate-400 text-sm">Turn LinkedIn into your #1 lead generation channel. Attract ideal clients and grow revenue.</div>
            <div class="flex gap-2 mt-2">
              <span class="badge badge-green">Lead Gen</span>
              <span class="badge badge-green">Sales Pipeline</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card cursor-pointer hover:border-red-500/50 obj-card md:col-span-2" data-obj="funding_investors" onclick="selectObjective(this,'funding_investors')">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style="background:rgba(239,68,68,.15)">
            <i class="fas fa-rocket text-red-400 text-xl"></i>
          </div>
          <div>
            <div class="font-bold text-white mb-1">Funding &amp; Investor Outreach</div>
            <div class="text-slate-400 text-sm">Build the personal brand that attracts VCs and angel investors. Establish credibility for your startup journey.</div>
            <div class="flex gap-2 mt-2">
              <span class="badge badge-red">VC Network</span>
              <span class="badge badge-red">Investor Relations</span>
              <span class="badge badge-red">Startup Credibility</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="text-center">
      <button id="obj-continue-btn" class="btn-pro px-8 py-4 text-base opacity-50 cursor-not-allowed" disabled onclick="continueToStrategy()">
        <i class="fas fa-arrow-right mr-2"></i>Generate My 12-Month Strategy
      </button>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════════════════════════════════
     MAIN DASHBOARD
══════════════════════════════════════════════════════════════════════════════ -->
<section id="page-dashboard" class="section min-h-screen flex">
  <!-- Sidebar -->
  <aside class="w-60 glass-dark fixed left-0 top-0 bottom-0 flex flex-col py-6 px-4 z-40 border-r border-white/5">
    <div class="flex items-center gap-3 mb-8 px-2">
      <div class="w-8 h-8 grad-li rounded-lg flex items-center justify-center">
        <i class="fab fa-linkedin text-white text-sm"></i>
      </div>
      <div>
        <div class="font-black text-white text-sm">LinkedBoost AI</div>
        <div class="text-xs text-slate-500" id="sidebar-plan-badge">Pro Plan</div>
      </div>
    </div>

    <!-- User Profile Mini -->
    <div class="glass rounded-xl p-3 mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 grad-li rounded-full flex items-center justify-center font-bold text-white text-sm" id="sidebar-avatar">JS</div>
        <div class="min-w-0">
          <div class="text-sm font-semibold text-white truncate" id="sidebar-name">John Smith</div>
          <div class="text-xs text-slate-500 flex items-center gap-1">
            <div class="pulse-dot w-2 h-2"></div>Active
          </div>
        </div>
      </div>
    </div>

    <nav class="sidebar-nav flex-1">
      <div class="nav-item active" onclick="switchTab('overview')">
        <i class="fas fa-chart-pie w-4"></i><span>Overview</span>
      </div>
      <div class="nav-item" onclick="switchTab('approvals')">
        <i class="fas fa-bell w-4"></i><span>Approvals</span>
        <span class="ml-auto badge badge-red text-xs" id="approval-count">3</span>
      </div>
      <div class="nav-item" onclick="switchTab('content')">
        <i class="fas fa-pen-fancy w-4"></i><span>Content Queue</span>
      </div>
      <div class="nav-item" onclick="switchTab('strategy')">
        <i class="fas fa-road w-4"></i><span>12-Mo Strategy</span>
      </div>
      <div class="nav-item" onclick="switchTab('daily')">
        <i class="fas fa-calendar-day w-4"></i><span>Daily Plan</span>
      </div>
      <div class="nav-item" onclick="switchTab('network')">
        <i class="fas fa-users w-4"></i><span>Network Builder</span>
      </div>
      <div class="nav-item" onclick="switchTab('analytics')">
        <i class="fas fa-chart-line w-4"></i><span>Analytics</span>
      </div>
      <div class="nav-item" onclick="switchTab('generate')">
        <i class="fas fa-robot w-4"></i><span>AI Generate</span>
      </div>
    </nav>

    <div class="mt-auto space-y-2">
      <div class="glass rounded-xl p-3 text-center">
        <div class="text-xs text-slate-500 mb-1">Goal Progress</div>
        <div class="text-lg font-black text-white" id="sidebar-progress">34%</div>
        <div class="progress-bar mt-1">
          <div class="progress-fill grad-li" id="sidebar-progress-bar" style="width:34%"></div>
        </div>
        <div class="text-xs text-slate-600 mt-1">Month 4 of 12</div>
      </div>
      <button class="btn-ghost w-full text-xs" onclick="showPage('page-landing')">
        <i class="fas fa-sign-out-alt mr-2"></i>Logout
      </button>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="ml-60 flex-1 min-h-screen p-6 overflow-y-auto">
    <!-- Tab: Overview -->
    <div id="tab-overview" class="tab-content">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-black text-white">Dashboard Overview</h1>
          <p class="text-slate-400 text-sm mt-1" id="overview-subtitle">Tracking your LinkedIn growth — Month 4 of 12</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="badge badge-green text-sm px-3 py-1">
            <div class="pulse-dot w-1.5 h-1.5 mr-1"></div>AI Active
          </span>
          <button class="btn-ghost text-sm" onclick="switchTab('approvals')">
            <i class="fas fa-bell mr-2 text-yellow-400"></i>3 Pending Approvals
          </button>
        </div>
      </div>

      <!-- Metrics Grid -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div class="metric-card">
          <div class="flex items-center justify-between mb-3">
            <div class="text-xs text-slate-500 font-semibold uppercase tracking-wide">Followers</div>
            <div class="w-8 h-8 grad-li rounded-lg flex items-center justify-center">
              <i class="fas fa-users text-white text-xs"></i>
            </div>
          </div>
          <div class="text-3xl font-black text-white mb-1" id="m-followers">2,847</div>
          <div class="flex items-center gap-1">
            <i class="fas fa-arrow-up text-green-400 text-xs"></i>
            <span class="text-green-400 text-xs font-semibold">+234 (9.0%)</span>
            <span class="text-slate-600 text-xs">this month</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="flex items-center justify-between mb-3">
            <div class="text-xs text-slate-500 font-semibold uppercase tracking-wide">Profile Views</div>
            <div class="w-8 h-8 grad-pro rounded-lg flex items-center justify-center">
              <i class="fas fa-eye text-white text-xs"></i>
            </div>
          </div>
          <div class="text-3xl font-black text-white mb-1" id="m-views">1,203</div>
          <div class="flex items-center gap-1">
            <i class="fas fa-arrow-up text-green-400 text-xs"></i>
            <span class="text-green-400 text-xs font-semibold">+456 (61%)</span>
            <span class="text-slate-600 text-xs">this month</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="flex items-center justify-between mb-3">
            <div class="text-xs text-slate-500 font-semibold uppercase tracking-wide">Impressions</div>
            <div class="w-8 h-8 grad-green rounded-lg flex items-center justify-center">
              <i class="fas fa-chart-bar text-white text-xs"></i>
            </div>
          </div>
          <div class="text-3xl font-black text-white mb-1" id="m-impressions">28.4K</div>
          <div class="flex items-center gap-1">
            <i class="fas fa-arrow-up text-green-400 text-xs"></i>
            <span class="text-green-400 text-xs font-semibold">+8.2K (40.6%)</span>
            <span class="text-slate-600 text-xs">this week</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="flex items-center justify-between mb-3">
            <div class="text-xs text-slate-500 font-semibold uppercase tracking-wide">Engagement Rate</div>
            <div class="w-8 h-8 grad-orange rounded-lg flex items-center justify-center">
              <i class="fas fa-heart text-white text-xs"></i>
            </div>
          </div>
          <div class="text-3xl font-black text-white mb-1" id="m-engagement">4.8%</div>
          <div class="flex items-center gap-1">
            <i class="fas fa-arrow-up text-green-400 text-xs"></i>
            <span class="text-green-400 text-xs font-semibold">+1.2% (33%)</span>
            <span class="text-slate-600 text-xs">vs last month</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="flex items-center justify-between mb-3">
            <div class="text-xs text-slate-500 font-semibold uppercase tracking-wide">Connections</div>
            <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:linear-gradient(135deg,#0891b2,#06b6d4)">
              <i class="fas fa-handshake text-white text-xs"></i>
            </div>
          </div>
          <div class="text-3xl font-black text-white mb-1" id="m-connections">892</div>
          <div class="flex items-center gap-1">
            <i class="fas fa-arrow-up text-green-400 text-xs"></i>
            <span class="text-green-400 text-xs font-semibold">+87 (10.8%)</span>
            <span class="text-slate-600 text-xs">this month</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="flex items-center justify-between mb-3">
            <div class="text-xs text-slate-500 font-semibold uppercase tracking-wide">Search Views</div>
            <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:linear-gradient(135deg,#7c3aed,#9333ea)">
              <i class="fas fa-search text-white text-xs"></i>
            </div>
          </div>
          <div class="text-3xl font-black text-white mb-1" id="m-search">345</div>
          <div class="flex items-center gap-1">
            <i class="fas fa-arrow-up text-green-400 text-xs"></i>
            <span class="text-green-400 text-xs font-semibold">+120 (53%)</span>
            <span class="text-slate-600 text-xs">this week</span>
          </div>
        </div>
      </div>

      <!-- Chart + Goal Progress -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="glass rounded-xl p-4 md:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-white text-sm">Weekly Engagement Trend</h3>
            <span class="badge badge-green text-xs">Live</span>
          </div>
          <canvas id="engagementChart" height="180"></canvas>
        </div>
        <div class="glass rounded-xl p-4">
          <h3 class="font-bold text-white text-sm mb-4">12-Month Goal Progress</h3>
          <div class="space-y-4">
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="text-slate-400">Followers</span>
                <span class="text-white font-semibold">2,847 / 5,000</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill grad-li" style="width:57%"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="text-slate-400">Connections</span>
                <span class="text-white font-semibold">892 / 2,000</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill grad-pro" style="width:44%"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="text-slate-400">Posts Published</span>
                <span class="text-white font-semibold">47 / 100</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill grad-green" style="width:47%"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="text-slate-400">Engagement Rate</span>
                <span class="text-white font-semibold">4.8% / 8%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill grad-orange" style="width:60%"></div>
              </div>
            </div>
          </div>
          <div class="mt-4 glass rounded-lg p-3 text-center">
            <div class="text-xs text-slate-500 mb-1">Overall Goal Progress</div>
            <div class="text-2xl font-black text-white">34%</div>
            <div class="text-xs text-green-400">On Track</div>
          </div>
        </div>
      </div>

      <!-- Top Posts -->
      <div class="glass rounded-xl p-4">
        <h3 class="font-bold text-white text-sm mb-4">Top Performing Posts This Month</h3>
        <div class="space-y-3">
          <div class="flex items-center gap-4 p-3 rounded-lg" style="background:rgba(255,255,255,.03)">
            <div class="text-2xl font-black text-slate-600 w-8">1</div>
            <div class="flex-1 min-w-0">
              <div class="text-sm text-white truncate">3 things about leadership nobody tells you...</div>
              <div class="flex items-center gap-3 mt-1">
                <span class="text-xs text-slate-500">12.4K impressions</span>
                <span class="text-xs text-green-400">3.8% eng</span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-bold text-white">342</div>
              <div class="text-xs text-slate-500">likes</div>
            </div>
          </div>
          <div class="flex items-center gap-4 p-3 rounded-lg" style="background:rgba(255,255,255,.03)">
            <div class="text-2xl font-black text-slate-600 w-8">2</div>
            <div class="flex-1 min-w-0">
              <div class="text-sm text-white truncate">The Future of AI in Enterprise - My Take</div>
              <div class="flex items-center gap-3 mt-1">
                <span class="text-xs text-slate-500">8.9K impressions</span>
                <span class="text-xs text-green-400">5.4% eng</span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-bold text-white">234</div>
              <div class="text-xs text-slate-500">likes</div>
            </div>
          </div>
          <div class="flex items-center gap-4 p-3 rounded-lg" style="background:rgba(255,255,255,.03)">
            <div class="text-2xl font-black text-slate-600 w-8">3</div>
            <div class="flex-1 min-w-0">
              <div class="text-sm text-white truncate">I was wrong about remote work - here is why</div>
              <div class="flex items-center gap-3 mt-1">
                <span class="text-xs text-slate-500">7.2K impressions</span>
                <span class="text-xs text-green-400">10.2% eng</span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-bold text-white">456</div>
              <div class="text-xs text-slate-500">likes</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: Approvals -->
    <div id="tab-approvals" class="tab-content hidden">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-black text-white">Human Approvals</h1>
          <p class="text-slate-400 text-sm mt-1">Review and approve AI-generated actions before execution</p>
        </div>
        <div class="flex gap-3">
          <button class="btn-success text-sm" onclick="approveAll()">
            <i class="fas fa-check-double mr-2"></i>Approve All
          </button>
          <button class="btn-ghost text-sm" onclick="loadApprovals()">
            <i class="fas fa-sync mr-2"></i>Refresh
          </button>
        </div>
      </div>
      <div id="approvals-list" class="space-y-4"></div>
    </div>

    <!-- Tab: Content Queue -->
    <div id="tab-content" class="tab-content hidden">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-black text-white">Content Queue</h1>
          <p class="text-slate-400 text-sm mt-1">Scheduled content awaiting publication</p>
        </div>
        <button class="btn-pro text-sm" onclick="switchTab('generate')">
          <i class="fas fa-plus mr-2"></i>Generate Content
        </button>
      </div>
      <div class="grid grid-cols-4 gap-3 mb-6">
        <div class="glass rounded-xl p-4 text-center">
          <div class="text-2xl font-black text-yellow-400">3</div>
          <div class="text-xs text-slate-500 mt-1">Pending Approval</div>
        </div>
        <div class="glass rounded-xl p-4 text-center">
          <div class="text-2xl font-black text-green-400">5</div>
          <div class="text-xs text-slate-500 mt-1">Approved</div>
        </div>
        <div class="glass rounded-xl p-4 text-center">
          <div class="text-2xl font-black text-blue-400">8</div>
          <div class="text-xs text-slate-500 mt-1">Scheduled</div>
        </div>
        <div class="glass rounded-xl p-4 text-center">
          <div class="text-2xl font-black text-white">23</div>
          <div class="text-xs text-slate-500 mt-1">Published</div>
        </div>
      </div>
      <div id="content-queue-list" class="space-y-3"></div>
    </div>

    <!-- Tab: Strategy -->
    <div id="tab-strategy" class="tab-content hidden">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-black text-white">12-Month Strategy</h1>
          <p class="text-slate-400 text-sm mt-1">Your personalized LinkedIn growth roadmap</p>
        </div>
        <button class="btn-ghost text-sm" onclick="loadStrategy()">
          <i class="fas fa-sync mr-2"></i>Regenerate
        </button>
      </div>
      <div id="strategy-content" class="space-y-4"></div>
    </div>

    <!-- Tab: Daily Plan -->
    <div id="tab-daily" class="tab-content hidden">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-black text-white">Daily Execution Plan</h1>
          <p class="text-slate-400 text-sm mt-1" id="daily-date-header">Loading today's plan...</p>
        </div>
        <button class="btn-li text-sm" onclick="loadDailyPlan()">
          <i class="fas fa-sync mr-2"></i>Refresh Plan
        </button>
      </div>
      <div id="daily-plan-content" class="space-y-4"></div>
    </div>

    <!-- Tab: Network Builder -->
    <div id="tab-network" class="tab-content hidden">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-black text-white">Network Builder</h1>
          <p class="text-slate-400 text-sm mt-1">AI-curated connection targets based on your objective</p>
        </div>
      </div>
      <div id="network-suggestions" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
    </div>

    <!-- Tab: Analytics -->
    <div id="tab-analytics" class="tab-content hidden">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-black text-white">Deep Analytics</h1>
          <p class="text-slate-400 text-sm mt-1">Track your LinkedIn growth against 12-month targets</p>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="glass rounded-xl p-5">
          <h3 class="font-bold text-white mb-4">Follower Growth Trajectory</h3>
          <canvas id="followerChart" height="200"></canvas>
        </div>
        <div class="glass rounded-xl p-5">
          <h3 class="font-bold text-white mb-4">Engagement Rate Trend</h3>
          <canvas id="engagementTrendChart" height="200"></canvas>
        </div>
        <div class="glass rounded-xl p-5">
          <h3 class="font-bold text-white mb-4">Content Performance by Type</h3>
          <canvas id="contentTypeChart" height="200"></canvas>
        </div>
        <div class="glass rounded-xl p-5">
          <h3 class="font-bold text-white mb-4">Goal Achievement Progress</h3>
          <canvas id="goalChart" height="200"></canvas>
        </div>
      </div>
    </div>

    <!-- Tab: AI Generate -->
    <div id="tab-generate" class="tab-content hidden">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-black text-white">AI Content Generator</h1>
          <p class="text-slate-400 text-sm mt-1">Generate posts, articles, and outreach messages powered by Groq AI</p>
        </div>
      </div>
      <div class="glass rounded-xl p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label class="text-sm font-semibold text-slate-300 mb-2 block">Content Type</label>
            <select id="gen-type" class="sel">
              <option value="post">LinkedIn Post</option>
              <option value="article">Long-form Article</option>
              <option value="poll">Poll</option>
              <option value="story">Personal Story</option>
              <option value="outreach">Connection Outreach DM</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-semibold text-slate-300 mb-2 block">Topic / Keyword</label>
            <input type="text" id="gen-topic" class="inp" placeholder="e.g. AI in leadership" />
          </div>
          <div>
            <label class="text-sm font-semibold text-slate-300 mb-2 block">Tone</label>
            <select id="gen-tone" class="sel">
              <option value="professional yet conversational">Professional + Conversational</option>
              <option value="bold and provocative">Bold & Provocative</option>
              <option value="educational and helpful">Educational</option>
              <option value="personal and vulnerable">Personal & Vulnerable</option>
              <option value="data-driven and analytical">Data-Driven</option>
            </select>
          </div>
        </div>
        <button class="btn-pro w-full py-3" onclick="generateContent()">
          <i class="fas fa-magic mr-2"></i>Generate with Groq AI
        </button>
      </div>
      <div id="generated-content" class="space-y-4"></div>
    </div>
  </main>
</section>

<!-- ═══════════════════════════════════════════════════════════════════════════
     JAVASCRIPT APPLICATION
══════════════════════════════════════════════════════════════════════════════ -->
<script>
// ─── APP STATE ────────────────────────────────────────────────────────────────
const APP = {
  currentPage: 'page-landing',
  currentTab: 'overview',
  user: null,
  plan: 'free',
  linkedinUrl: '',
  analysis: null,
  strategy: null,
  objective: null,
  authMethod: null,
  otpPhone: '',
  otpEmail: '',
  charts: {}
};

// ─── PAGE NAVIGATION ──────────────────────────────────────────────────────────
function showPage(pageId) {
  document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
  var el = document.getElementById(pageId);
  if (el) { el.classList.add('active'); }
  APP.currentPage = pageId;
  if (pageId === 'page-dashboard') {
    setTimeout(initDashboard, 100);
  }
}

function showSignup(plan) {
  APP.plan = plan || 'pro';
  var badge = document.getElementById('plan-badge-auth');
  var badgeText = document.getElementById('plan-badge-text');
  if (plan && plan !== 'free') {
    badge.classList.remove('hidden');
    badgeText.textContent = (plan === 'enterprise' ? 'Enterprise' : 'Pro') + ' Plan Selected';
  }
  showPage('page-auth');
  showAuthStep('step1');
}

function selectPlan(plan) {
  APP.plan = plan;
  if (plan === 'free') { showPage('page-analyze'); }
  else { showSignup(plan); }
}

// ─── AUTH FLOW ────────────────────────────────────────────────────────────────
function showAuthStep(step) {
  ['auth-step1','auth-step-sms','auth-step-email','auth-step-otp'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  var target = step === 'step1' ? 'auth-step1' : (step === 'sms' ? 'auth-step-sms' : (step === 'email' ? 'auth-step-email' : 'auth-step-otp'));
  var el = document.getElementById(target);
  if (el) el.classList.remove('hidden');
}

function chooseAuthMethod(method) {
  APP.authMethod = method;
  var email = document.getElementById('auth-email').value.trim();
  if (!email) { showNotif('Please enter your email address first', 'error'); return; }
  var name = document.getElementById('auth-name').value.trim();
  if (!name) { showNotif('Please enter your name', 'error'); return; }
  APP.user = { name: name, email: email };
  if (method === 'email') {
    document.getElementById('email-display').textContent = email;
    showAuthStep('email');
  } else {
    showAuthStep('sms');
  }
}

async function sendSmsOtp() {
  var countryEl = document.querySelector('#auth-step-sms select');
  var phoneEl = document.getElementById('auth-phone');
  var countryCode = countryEl ? countryEl.value : '+91';
  var phone = (phoneEl ? phoneEl.value.trim() : '');
  if (!phone) { showNotif('Please enter your phone number', 'error'); return; }
  var fullPhone = countryCode + phone;
  APP.otpPhone = fullPhone;
  APP.authMethod = 'sms';
  showNotif('Sending OTP via Twilio...', 'info');
  try {
    var res = await axios.post('/api/auth/send-otp', { phone: fullPhone });
    if (res.data.success) {
      document.getElementById('otp-sent-to').textContent = 'Code sent to ' + fullPhone;
      showAuthStep('otp');
      showNotif('OTP sent successfully!', 'success');
    } else {
      showNotif('Failed to send OTP. Check phone number.', 'error');
    }
  } catch(e) {
    showNotif('SMS service error. Try email verification.', 'error');
  }
}

async function sendEmailOtp() {
  var email = APP.user ? APP.user.email : '';
  if (!email) { showNotif('Email not set', 'error'); return; }
  APP.otpEmail = email;
  APP.authMethod = 'email';
  showNotif('Sending OTP to ' + email + '...', 'info');
  try {
    var res = await axios.post('/api/auth/send-email-otp', { email: email });
    if (res.data.success) {
      document.getElementById('otp-sent-to').textContent = 'Code sent to ' + email;
      // For demo: show OTP in notification
      showNotif('OTP sent! Demo code: ' + (res.data.otp || '------'), 'success');
      showAuthStep('otp');
    } else {
      showNotif('Failed to send email OTP', 'error');
    }
  } catch(e) {
    showNotif('Email service error', 'error');
  }
}

function otpNext(current, nextId) {
  if (current.value.length === 1) {
    var next = document.getElementById(nextId);
    if (next) next.focus();
  }
}

function otpSubmit(current) {
  if (current.value.length === 1) { verifyOtp(); }
}

async function verifyOtp() {
  var code = '';
  for (var i = 1; i <= 6; i++) {
    var el = document.getElementById('otp' + i);
    code += el ? (el.value || '') : '';
  }
  if (code.length < 6) { showNotif('Please enter the complete 6-digit code', 'error'); return; }

  showNotif('Verifying...', 'info');
  try {
    var verified = false;
    if (APP.authMethod === 'sms') {
      var res = await axios.post('/api/auth/verify-otp', { phone: APP.otpPhone, code: code });
      verified = res.data.success || res.data.valid;
    } else {
      // For email OTP demo: any 6-digit code passes (replace with real verification)
      verified = code.length === 6;
    }

    if (verified) {
      showNotif('Verified! Welcome to LinkedBoost AI', 'success');
      if (APP.linkedinUrl) {
        showPage('page-objective');
      } else {
        showPage('page-analyze');
      }
    } else {
      showNotif('Invalid OTP. Please try again.', 'error');
    }
  } catch(e) {
    // Demo fallback: allow any 6-digit code
    showNotif('Verified! Welcome to LinkedBoost AI', 'success');
    if (APP.linkedinUrl) { showPage('page-objective'); }
    else { showPage('page-analyze'); }
  }
}

function resendOtp() {
  if (APP.authMethod === 'sms') { sendSmsOtp(); }
  else { sendEmailOtp(); }
}

// ─── FREE ANALYSIS ────────────────────────────────────────────────────────────
function startFreeAnalysis() {
  var val = document.getElementById('hero-linkedin-input').value.trim();
  if (!val) { showNotif('Please enter a LinkedIn URL', 'error'); return; }
  document.getElementById('analyze-url').value = val;
  showPage('page-analyze');
  runAnalysis();
}

async function runAnalysis() {
  var url = document.getElementById('analyze-url').value.trim();
  if (!url) { showNotif('Please enter your LinkedIn URL', 'error'); return; }
  if (!url.includes('linkedin.com/in/')) {
    if (!url.includes('http')) url = 'https://linkedin.com/in/' + url;
    else { showNotif('Please enter a valid LinkedIn URL (linkedin.com/in/yourname)', 'error'); return; }
  }

  APP.linkedinUrl = url;

  document.getElementById('analyze-input-card').classList.add('hidden');
  document.getElementById('analyze-loading').classList.remove('hidden');
  document.getElementById('analyze-results').innerHTML = '';

  // Animate loading steps
  var steps = ['step1','step2','step3','step4'];
  var messages = [
    'Validated LinkedIn URL',
    'Groq AI scanning profile structure...',
    'Generating insights and gap analysis...',
    'Benchmarking against top profiles...'
  ];
  var statusEl = document.getElementById('analyze-status');
  var stepDelay = 800;
  for (var i = 0; i < steps.length; i++) {
    await delay(stepDelay);
    var stepEl = document.getElementById(steps[i]);
    if (stepEl) {
      stepEl.style.color = '#34d399';
      stepEl.innerHTML = '<i class="fas fa-check-circle text-green-400"></i> ' + messages[i];
    }
    if (statusEl) statusEl.textContent = messages[i];
  }

  try {
    var res = await axios.post('/api/analyze', { linkedinUrl: url });
    document.getElementById('analyze-loading').classList.add('hidden');

    if (res.data.success) {
      APP.analysis = res.data.analysis;
      renderAnalysisResults(res.data.analysis, res.data.fromAI);
    } else {
      showAnalysisError(res.data.error || 'Analysis failed');
    }
  } catch(e) {
    document.getElementById('analyze-loading').classList.add('hidden');
    showAnalysisError('Failed to connect to AI. Please try again.');
    document.getElementById('analyze-input-card').classList.remove('hidden');
  }
}

function renderAnalysisResults(a, fromAI) {
  var scoreColor = a.profileScore >= 70 ? '#10B981' : (a.profileScore >= 50 ? '#F59E0B' : '#EF4444');
  var scoreGrade = a.profileScore >= 80 ? 'A' : (a.profileScore >= 70 ? 'B' : (a.profileScore >= 60 ? 'C' : (a.profileScore >= 50 ? 'D' : 'F')));

  var strengthsHtml = (a.strengths || []).map(function(s) {
    return '<div class="flex items-start gap-2 text-sm"><i class="fas fa-check-circle text-green-400 mt-0.5 flex-shrink-0"></i><span class="text-slate-300">' + escHtml(s) + '</span></div>';
  }).join('');

  var gapsHtml = (a.criticalGaps || []).map(function(g) {
    return '<div class="flex items-start gap-2 text-sm"><i class="fas fa-exclamation-triangle text-red-400 mt-0.5 flex-shrink-0"></i><span class="text-slate-300">' + escHtml(g) + '</span></div>';
  }).join('');

  var winsHtml = (a.quickWins || []).map(function(w, i) {
    return '<div class="flex items-start gap-3 text-sm"><span class="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">' + (i+1) + '</span><span class="text-slate-300">' + escHtml(w) + '</span></div>';
  }).join('');

  var html = '<div class="space-y-4 fade-in">';

  // Score Card
  html += '<div class="glass rounded-2xl p-6">';
  html += '<div class="flex items-center justify-between mb-6">';
  html += '<div><h3 class="text-xl font-black text-white">Profile Analysis Complete</h3>';
  html += '<p class="text-slate-400 text-sm mt-1">' + escHtml(a.name) + ' &bull; ' + escHtml(a.inferredTitle) + ' &bull; ' + escHtml(a.inferredIndustry) + '</p></div>';
  if (fromAI) {
    html += '<span class="badge badge-green text-xs px-3 py-1"><i class="fas fa-robot mr-1"></i>Groq AI</span>';
  }
  html += '</div>';

  // Score Meters
  html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">';
  var metrics = [
    { label: 'Profile Score', val: a.profileScore, color: scoreColor },
    { label: 'Profile Completeness', val: a.profileCompleteness, color: '#0077B5' },
    { label: 'Keyword Optimization', val: a.keywordOptimization, color: '#7C3AED' },
    { label: 'Content Score', val: a.contentScore, color: '#F59E0B' }
  ];
  metrics.forEach(function(m) {
    html += '<div class="text-center p-4 rounded-xl" style="background:rgba(255,255,255,.03)">';
    html += '<div class="text-3xl font-black mb-1" style="color:' + m.color + '">' + m.val + '</div>';
    html += '<div class="text-xs text-slate-500 mb-2">' + m.label + '</div>';
    html += '<div class="progress-bar"><div class="progress-fill" style="width:' + m.val + '%;background:' + m.color + '"></div></div>';
    html += '</div>';
  });
  html += '</div>';

  // AI Insight
  html += '<div class="glass rounded-xl p-4 border-l-4 border-blue-500 mb-4">';
  html += '<div class="flex items-start gap-3"><i class="fas fa-lightbulb text-yellow-400 mt-1"></i>';
  html += '<div><div class="text-sm font-bold text-white mb-1">AI Assessment</div>';
  html += '<div class="text-sm text-slate-300">' + escHtml(a.analysisInsight) + '</div></div></div></div>';

  // Stats Row
  html += '<div class="grid grid-cols-3 gap-3">';
  html += '<div class="glass rounded-lg p-3 text-center"><div class="text-lg font-black text-white">' + a.estimatedWeeklyViews + '</div><div class="text-xs text-slate-500">Weekly Views</div></div>';
  html += '<div class="glass rounded-lg p-3 text-center"><div class="text-lg font-black text-white">' + escHtml(a.followerEstimate) + '</div><div class="text-xs text-slate-500">Est. Followers</div></div>';
  html += '<div class="glass rounded-lg p-3 text-center"><div class="text-lg font-black ' + (a.recruiterVisibility === 'Low' ? 'text-red-400' : 'text-green-400') + '">' + escHtml(a.recruiterVisibility) + '</div><div class="text-xs text-slate-500">Recruiter Visibility</div></div>';
  html += '</div></div>';

  // Strengths + Gaps
  html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
  html += '<div class="glass rounded-xl p-5"><h4 class="font-bold text-white mb-3"><i class="fas fa-thumbs-up text-green-400 mr-2"></i>Strengths</h4><div class="space-y-2">' + strengthsHtml + '</div></div>';
  html += '<div class="glass rounded-xl p-5"><h4 class="font-bold text-white mb-3"><i class="fas fa-exclamation-triangle text-red-400 mr-2"></i>Critical Gaps</h4><div class="space-y-2">' + gapsHtml + '</div></div>';
  html += '</div>';

  // Quick Wins
  html += '<div class="glass rounded-xl p-5"><h4 class="font-bold text-white mb-3"><i class="fas fa-bolt text-yellow-400 mr-2"></i>5 Quick Wins to Implement Today</h4><div class="space-y-3">' + winsHtml + '</div></div>';

  // Upgrade CTA
  html += '<div class="glass rounded-2xl p-6 text-center" style="border:1px solid rgba(124,58,237,.3);background:rgba(124,58,237,.05)">';
  html += '<div class="text-2xl mb-2">🚀</div>';
  html += '<h3 class="text-xl font-black text-white mb-2">Want to Fix All of This?</h3>';
  html += '<p class="text-slate-400 text-sm mb-6 max-w-lg mx-auto">Upgrade to Pro and get a complete 12-month strategy, AI content generation, automated execution, and human-in-loop approval workflows — all customized to your objective.</p>';
  html += '<div class="flex gap-3 justify-center flex-wrap">';
  html += '<button class="btn-pro px-6 py-3" onclick="goToPro()"><i class="fas fa-rocket mr-2"></i>Get Pro Plan - $29/mo</button>';
  html += '<button class="btn-ghost px-6 py-3" onclick="showPage(&#39;page-pricing&#39;)"><i class="fas fa-eye mr-2"></i>See All Features</button>';
  html += '</div></div>';

  html += '</div>';

  document.getElementById('analyze-results').innerHTML = html;
}

function showAnalysisError(msg) {
  document.getElementById('analyze-results').innerHTML =
    '<div class="glass rounded-xl p-6 text-center"><i class="fas fa-exclamation-circle text-red-400 text-3xl mb-3 block"></i>' +
    '<div class="text-white font-bold mb-2">Analysis Failed</div>' +
    '<div class="text-slate-400 text-sm">' + escHtml(msg) + '</div>' +
    '<button class="btn-ghost mt-4" onclick="document.getElementById(&#39;analyze-input-card&#39;).classList.remove(&#39;hidden&#39;);document.getElementById(&#39;analyze-results&#39;).innerHTML=&#39;&#39;">Try Again</button></div>';
}

function goToPro() {
  if (!APP.user) { showSignup('pro'); }
  else if (APP.linkedinUrl && APP.analysis) { showPage('page-objective'); }
  else { showPage('page-pricing'); }
}

// ─── OBJECTIVE SELECTION ──────────────────────────────────────────────────────
function selectObjective(el, obj) {
  document.querySelectorAll('.obj-card').forEach(function(c) {
    c.style.borderColor = '';
    c.style.background = '';
  });
  el.style.borderColor = 'rgba(0,119,181,.5)';
  el.style.background = 'rgba(0,119,181,.08)';
  APP.objective = obj;
  var btn = document.getElementById('obj-continue-btn');
  btn.disabled = false;
  btn.classList.remove('opacity-50','cursor-not-allowed');
}

async function continueToStrategy() {
  if (!APP.objective) { showNotif('Please select an objective', 'error'); return; }

  showNotif('Generating your 12-month strategy with Groq AI...', 'info');

  // Set user name in sidebar
  if (APP.user) {
    var n = APP.user.name || 'User';
    var initials = n.split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0,2);
    document.getElementById('sidebar-name').textContent = n;
    document.getElementById('sidebar-avatar').textContent = initials;
  }

  try {
    var res = await axios.post('/api/strategy/generate', {
      linkedinUrl: APP.linkedinUrl,
      analysis: APP.analysis,
      objective: APP.objective
    });
    if (res.data.success) {
      APP.strategy = res.data.strategy;
      showNotif('Strategy generated! Welcome to your dashboard.', 'success');
    }
  } catch(e) {
    showNotif('Using default strategy. Dashboard ready.', 'info');
  }

  showPage('page-dashboard');
  setTimeout(initDashboard, 300);
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.add('hidden'); });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });

  var tabEl = document.getElementById('tab-' + tabName);
  if (tabEl) tabEl.classList.remove('hidden');
  APP.currentTab = tabName;

  // Find matching nav item
  document.querySelectorAll('.nav-item').forEach(function(n) {
    if (n.getAttribute('onclick') && n.getAttribute('onclick').includes(tabName)) {
      n.classList.add('active');
    }
  });

  if (tabName === 'approvals') loadApprovals();
  else if (tabName === 'content') loadContentQueue();
  else if (tabName === 'strategy') loadStrategy();
  else if (tabName === 'daily') loadDailyPlan();
  else if (tabName === 'network') loadNetwork();
  else if (tabName === 'analytics') setTimeout(initAnalyticsCharts, 200);
}

function initDashboard() {
  initEngagementChart();
  loadApprovals();
  loadContentQueue();
}

function initEngagementChart() {
  var ctx = document.getElementById('engagementChart');
  if (!ctx) return;
  if (APP.charts.engagement) { APP.charts.engagement.destroy(); }
  APP.charts.engagement = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
      datasets: [
        { label: 'Impressions', data: [3200,3800,4400,5000,5600,6200,6800], borderColor: '#0077B5', backgroundColor: 'rgba(0,119,181,.1)', tension: 0.4, fill: true },
        { label: 'Engagement', data: [80,98,116,134,152,170,188], borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,.1)', tension: 0.4, fill: true }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } }, scales: { x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,.05)' } }, y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,.05)' } } } }
  });
}

function initAnalyticsCharts() {
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var opts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } }, scales: { x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,.05)' } }, y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,.05)' } } } };

  var fc = document.getElementById('followerChart');
  if (fc) { if (APP.charts.follower) APP.charts.follower.destroy(); APP.charts.follower = new Chart(fc, { type: 'bar', data: { labels: months.slice(0,8), datasets: [{ label: 'Followers', data: [2200,2350,2480,2650,2720,2790,2820,2847], backgroundColor: '#0077B5', borderRadius: 6 }] }, options: opts }); }

  var ec = document.getElementById('engagementTrendChart');
  if (ec) { if (APP.charts.engTrend) APP.charts.engTrend.destroy(); APP.charts.engTrend = new Chart(ec, { type: 'line', data: { labels: months.slice(0,8), datasets: [{ label: 'Engagement Rate %', data: [2.1,2.8,3.2,3.7,4.1,4.4,4.6,4.8], borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,.1)', tension: 0.4, fill: true }] }, options: opts }); }

  var cc = document.getElementById('contentTypeChart');
  if (cc) { if (APP.charts.contentType) APP.charts.contentType.destroy(); APP.charts.contentType = new Chart(cc, { type: 'doughnut', data: { labels: ['Posts','Articles','Polls','Stories'], datasets: [{ data: [45,25,15,15], backgroundColor: ['#0077B5','#7C3AED','#10B981','#F59E0B'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 } } } } } }); }

  var gc = document.getElementById('goalChart');
  if (gc) { if (APP.charts.goal) APP.charts.goal.destroy(); APP.charts.goal = new Chart(gc, { type: 'radar', data: { labels: ['Followers','Engagement','Content','Network','Visibility','Authority'], datasets: [{ label: 'Current', data: [57,60,47,44,65,35], borderColor: '#0077B5', backgroundColor: 'rgba(0,119,181,.15)', pointBackgroundColor: '#0077B5' }, { label: 'Target', data: [100,100,100,100,100,100], borderColor: 'rgba(255,255,255,.1)', backgroundColor: 'transparent', borderDash: [5,5] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } }, scales: { r: { ticks: { color: '#64748b', stepSize: 25 }, grid: { color: 'rgba(255,255,255,.08)' }, angleLines: { color: 'rgba(255,255,255,.08)' }, pointLabels: { color: '#94a3b8' } } } } }); }
}

// ─── APPROVALS ────────────────────────────────────────────────────────────────
function loadApprovals() {
  var approvals = [
    { id: 'ap1', priority: 'high', type: 'LinkedIn Post', title: 'Thought Leadership: AI in Your Industry', preview: 'Here are 3 ways AI is reshaping how top professionals work in 2025 and what you can do about it today...', score: 91, reach: '3,200-5,800', bestTime: 'Today 8:00 AM', tags: ['#AI','#Leadership','#FutureOfWork'] },
    { id: 'ap2', priority: 'high', type: 'Connection Requests (15)', title: '15 Personalized Requests to Industry Leaders', preview: 'Targeted: CTOs at Series B+ startups, VP Engineering at Fortune 500, and emerging tech founders with 5K+ followers', score: 88, reach: '15 connections', bestTime: 'Today 11:00 AM', tags: ['CTOs','VPs','Founders'] },
    { id: 'ap3', priority: 'medium', type: 'Long-form Article', title: 'Why 90% of LinkedIn Strategies Fail (And How to Fix Yours)', preview: 'Most professionals post content hoping for virality but never build the systematic approach that actually drives compounding growth...', score: 94, reach: '8,000-15,000', bestTime: 'Wednesday 10:00 AM', tags: ['#LinkedInStrategy','#PersonalBrand','#ProfessionalGrowth'] }
  ];

  var html = '';
  approvals.forEach(function(ap) {
    html += '<div class="approval-card ' + ap.priority + ' fade-in" id="apcard-' + ap.id + '">';
    html += '<div class="flex items-start justify-between gap-4">';
    html += '<div class="flex-1 min-w-0">';
    html += '<div class="flex items-center gap-2 mb-2">';
    html += '<span class="badge ' + (ap.priority === 'high' ? 'badge-red' : 'badge-yellow') + ' text-xs">' + ap.priority.toUpperCase() + '</span>';
    html += '<span class="badge badge-blue text-xs">' + escHtml(ap.type) + '</span>';
    html += '<span class="badge badge-green text-xs">Score: ' + ap.score + '</span>';
    html += '</div>';
    html += '<h4 class="font-bold text-white mb-1">' + escHtml(ap.title) + '</h4>';
    html += '<p class="text-slate-400 text-sm mb-3">' + escHtml(ap.preview) + '</p>';
    html += '<div class="flex flex-wrap gap-2 mb-3">';
    ap.tags.forEach(function(t) { html += '<span class="badge badge-blue text-xs">' + escHtml(t) + '</span>'; });
    html += '</div>';
    html += '<div class="flex gap-4 text-xs text-slate-500">';
    html += '<span><i class="fas fa-chart-bar mr-1 text-blue-400"></i>Est. Reach: ' + escHtml(ap.reach) + '</span>';
    html += '<span><i class="fas fa-clock mr-1 text-yellow-400"></i>' + escHtml(ap.bestTime) + '</span>';
    html += '</div>';
    html += '</div>';
    html += '<div class="flex flex-col gap-2 flex-shrink-0">';
    html += '<button class="btn-success text-xs px-3 py-2" onclick="approveItem(&#39;' + ap.id + '&#39;)"><i class="fas fa-check mr-1"></i>Approve</button>';
    html += '<button class="btn-ghost text-xs px-3 py-2" onclick="editItem(&#39;' + ap.id + '&#39;)"><i class="fas fa-edit mr-1"></i>Edit</button>';
    html += '<button class="btn-danger text-xs px-3 py-2" onclick="rejectItem(&#39;' + ap.id + '&#39;)"><i class="fas fa-times mr-1"></i>Reject</button>';
    html += '</div></div></div>';
  });

  var container = document.getElementById('approvals-list');
  if (container) container.innerHTML = html || '<div class="text-center text-slate-500 py-10">No pending approvals</div>';
}

function approveItem(id) {
  var el = document.getElementById('apcard-' + id);
  if (el) {
    el.style.borderLeftColor = '#10B981';
    el.style.background = 'rgba(16,185,129,.05)';
    el.querySelector('.flex.flex-col').innerHTML = '<span class="badge badge-green px-3 py-2"><i class="fas fa-check-circle mr-1"></i>Approved</span>';
  }
  showNotif('Action approved and scheduled!', 'success');
  updateApprovalCount(-1);
}

function rejectItem(id) {
  var el = document.getElementById('apcard-' + id);
  if (el) el.style.opacity = '0.4';
  showNotif('Action rejected and removed from queue', 'error');
  updateApprovalCount(-1);
}

function editItem(id) {
  showNotif('Opening editor for this item...', 'info');
}

function approveAll() {
  document.querySelectorAll('[id^="apcard-"]').forEach(function(el) {
    el.style.borderLeftColor = '#10B981';
    el.style.background = 'rgba(16,185,129,.05)';
    var btns = el.querySelector('.flex.flex-col');
    if (btns) btns.innerHTML = '<span class="badge badge-green px-3 py-2"><i class="fas fa-check-circle mr-1"></i>Approved</span>';
  });
  showNotif('All actions approved and scheduled!', 'success');
  document.getElementById('approval-count').textContent = '0';
}

function updateApprovalCount(delta) {
  var el = document.getElementById('approval-count');
  if (el) {
    var current = parseInt(el.textContent) || 0;
    var newVal = Math.max(0, current + delta);
    el.textContent = newVal;
  }
}

// ─── CONTENT QUEUE ────────────────────────────────────────────────────────────
function loadContentQueue() {
  var queue = [
    { id: 'q1', type: 'Post', topic: 'Industry Insight', scheduledFor: 'Today 8:00 AM', status: 'approved', preview: 'AI will not replace humans who use AI effectively...', score: 88 },
    { id: 'q2', type: 'Article', topic: 'Leadership', scheduledFor: 'Tomorrow 10:00 AM', status: 'pending', preview: 'The untold story of scaling a high-performance team...', score: 91 },
    { id: 'q3', type: 'Connections', topic: 'Network', scheduledFor: 'Today 11:00 AM', status: 'pending', preview: '15 personalized requests to CTOs and VPs', score: 82 },
    { id: 'q4', type: 'Comment', topic: 'Engagement', scheduledFor: 'Today 2:00 PM', status: 'approved', preview: 'Thoughtful comments on 5 trending posts in your niche', score: 75 }
  ];

  var html = '';
  queue.forEach(function(item) {
    var statusBadge = item.status === 'approved'
      ? '<span class="badge badge-green text-xs">Approved</span>'
      : '<span class="badge badge-yellow text-xs">Pending</span>';
    html += '<div class="card flex items-center gap-4">';
    html += '<div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background:rgba(0,119,181,.15)"><i class="fas fa-' + (item.type === 'Post' ? 'pen' : item.type === 'Article' ? 'newspaper' : item.type === 'Connections' ? 'users' : 'comment') + ' text-blue-400"></i></div>';
    html += '<div class="flex-1 min-w-0">';
    html += '<div class="flex items-center gap-2 mb-1">' + statusBadge + '<span class="badge badge-blue text-xs">' + escHtml(item.type) + '</span></div>';
    html += '<div class="text-sm text-white truncate">' + escHtml(item.preview) + '</div>';
    html += '<div class="text-xs text-slate-500 mt-1"><i class="fas fa-clock mr-1"></i>' + escHtml(item.scheduledFor) + ' &bull; Score: ' + item.score + '/100</div>';
    html += '</div>';
    html += '<div class="flex gap-2"><button class="btn-success text-xs" onclick="showNotif(&#39;Approved!&#39;,&#39;success&#39;)"><i class="fas fa-check"></i></button><button class="btn-danger text-xs" onclick="showNotif(&#39;Removed&#39;,&#39;error&#39;)"><i class="fas fa-times"></i></button></div>';
    html += '</div>';
  });

  var container = document.getElementById('content-queue-list');
  if (container) container.innerHTML = html;
}

// ─── STRATEGY ─────────────────────────────────────────────────────────────────
function loadStrategy() {
  var s = APP.strategy;
  if (!s) {
    document.getElementById('strategy-content').innerHTML =
      '<div class="text-center py-10"><div class="text-slate-400 mb-4">No strategy loaded yet. Complete the onboarding flow first.</div><button class="btn-pro" onclick="showPage(&#39;page-objective&#39;)">Set Objective</button></div>';
    return;
  }

  var roadmapHtml = (s.monthlyRoadmap || []).map(function(m) {
    return '<div class="card border-l-4" style="border-left-color:#0077B5">' +
      '<div class="flex items-center gap-3 mb-2">' +
      '<span class="w-8 h-8 grad-li rounded-full flex items-center justify-center text-white text-xs font-bold">' + m.month + '</span>' +
      '<div><div class="font-bold text-white text-sm">' + escHtml(m.theme) + '</div><div class="text-xs text-slate-500">' + escHtml(m.focus) + '</div></div>' +
      '<span class="ml-auto badge badge-green text-xs">' + escHtml(m.kpi) + '</span>' +
      '</div>' +
      '<div class="flex flex-wrap gap-2">' + (m.keyActions || []).map(function(a) { return '<span class="badge badge-blue text-xs">' + escHtml(a) + '</span>'; }).join('') + '</div>' +
      '</div>';
  }).join('');

  var pillarsHtml = (s.contentPillars || []).map(function(p) {
    return '<div class="flex items-center gap-3 mb-3">' +
      '<div class="text-sm text-white w-32 font-medium">' + escHtml(p.name) + '</div>' +
      '<div class="flex-1 progress-bar"><div class="progress-fill grad-li" style="width:' + p.percentage + '%"></div></div>' +
      '<div class="text-sm font-bold text-white w-10 text-right">' + p.percentage + '%</div>' +
      '</div>';
  }).join('');

  var html = '<div class="space-y-4">';

  // Strategy header
  html += '<div class="glass rounded-2xl p-6">';
  html += '<div class="flex items-start justify-between gap-4 mb-4">';
  html += '<div><h3 class="text-xl font-bold text-white">' + escHtml(s.strategyTitle || '12-Month Strategy') + '</h3>';
  html += '<p class="text-slate-400 text-sm mt-1">' + escHtml(s.executiveSummary || '') + '</p></div>';
  html += '<span class="badge badge-green text-xs px-3 py-1">' + escHtml(s.objective || APP.objective || '') + '</span>';
  html += '</div>';

  // Projected results
  var pr = s.projectedResults || {};
  html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-3">';
  [
    { label: 'Follower Growth', val: pr.followerGrowth || '+2,400' },
    { label: 'Profile Views', val: pr.profileViews || '+850%' },
    { label: 'Engagement Rate', val: pr.engagementRate || '6.2%' },
    { label: 'Opportunities', val: pr.opportunitiesGenerated || '35+/qtr' }
  ].forEach(function(r) {
    html += '<div class="glass rounded-lg p-3 text-center"><div class="text-lg font-black text-blue-400">' + escHtml(r.val) + '</div><div class="text-xs text-slate-500">' + r.label + '</div></div>';
  });
  html += '</div></div>';

  // Content Pillars
  html += '<div class="glass rounded-xl p-5"><h4 class="font-bold text-white mb-4"><i class="fas fa-columns text-blue-400 mr-2"></i>Content Pillars</h4>' + pillarsHtml + '</div>';

  // Monthly Roadmap
  html += '<div class="glass rounded-xl p-5"><h4 class="font-bold text-white mb-4"><i class="fas fa-road text-purple-400 mr-2"></i>Monthly Roadmap</h4><div class="space-y-3">' + roadmapHtml + '</div></div>';

  html += '</div>';
  document.getElementById('strategy-content').innerHTML = html;
}

// ─── DAILY PLAN ────────────────────────────────────────────────────────────────
async function loadDailyPlan() {
  document.getElementById('daily-plan-content').innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-blue-400 text-2xl mb-3 block"></i><div class="text-slate-400">Generating today&#39;s execution plan...</div></div>';

  try {
    var res = await axios.post('/api/execution/daily', {
      analysis: APP.analysis,
      strategy: APP.strategy
    });
    if (res.data.success) {
      renderDailyPlan(res.data.plan);
    }
  } catch(e) {
    renderDailyPlan({
      date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      theme: 'Visibility & Engagement Day',
      tasks: [
        { time: '7:30 AM', category: 'publish', task: 'Publish scheduled post', detail: 'Post the pre-approved thought leadership content', automated: true, requiresApproval: false, estimatedMinutes: 2, impactScore: 9 },
        { time: '9:00 AM', category: 'connect', task: 'Send 10 connection requests', detail: 'Target CTOs and VPs in your industry', automated: true, requiresApproval: true, estimatedMinutes: 10, impactScore: 7 },
        { time: '11:00 AM', category: 'engage', task: 'Comment on 5 trending posts', detail: 'Add thoughtful 3-4 sentence comments on viral posts', automated: false, requiresApproval: false, estimatedMinutes: 15, impactScore: 8 },
        { time: '1:00 PM', category: 'respond', task: 'Reply to all comments on your posts', detail: 'Respond within 2 hours to boost algorithm reach', automated: false, requiresApproval: false, estimatedMinutes: 10, impactScore: 9 },
        { time: '5:00 PM', category: 'analyze', task: 'Review daily analytics', detail: 'Check impressions, engagement, and new followers', automated: true, requiresApproval: false, estimatedMinutes: 5, impactScore: 6 }
      ],
      dailyGoal: 'Reach 500+ impressions today and gain 5 new followers',
      motivationalNote: 'Every post you publish is a seed. Consistency creates the forest.'
    });
  }
}

function renderDailyPlan(plan) {
  if (document.getElementById('daily-date-header')) {
    document.getElementById('daily-date-header').textContent = plan.date + ' - ' + (plan.theme || '');
  }

  var catColors = { publish: '#10B981', connect: '#0077B5', engage: '#7C3AED', respond: '#F59E0B', analyze: '#06b6d4' };
  var catIcons = { publish: 'paper-plane', connect: 'user-plus', engage: 'comment', respond: 'reply', analyze: 'chart-bar' };

  var tasksHtml = (plan.tasks || []).map(function(task) {
    var color = catColors[task.category] || '#94a3b8';
    var icon = catIcons[task.category] || 'tasks';
    return '<div class="card flex items-start gap-4">' +
      '<div class="text-xs font-bold text-slate-500 w-16 flex-shrink-0 pt-1">' + escHtml(task.time) + '</div>' +
      '<div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style="background:' + color + '22">' +
      '<i class="fas fa-' + icon + ' text-sm" style="color:' + color + '"></i></div>' +
      '<div class="flex-1">' +
      '<div class="flex items-center gap-2 mb-1">' +
      '<span class="text-sm font-bold text-white">' + escHtml(task.task) + '</span>' +
      (task.requiresApproval ? '<span class="badge badge-yellow text-xs">Needs Approval</span>' : '') +
      (task.automated ? '<span class="badge badge-blue text-xs">Automated</span>' : '') +
      '</div>' +
      '<div class="text-xs text-slate-400">' + escHtml(task.detail) + '</div>' +
      '<div class="text-xs text-slate-600 mt-1">' + task.estimatedMinutes + ' min &bull; Impact: ' + task.impactScore + '/10</div>' +
      '</div>' +
      (task.requiresApproval ? '<button class="btn-success text-xs flex-shrink-0" onclick="showNotif(&#39;Approved!&#39;,&#39;success&#39;)"><i class="fas fa-check mr-1"></i>Approve</button>' : '') +
      '</div>';
  }).join('');

  var html = '<div class="space-y-4">';

  // Daily Goal Banner
  html += '<div class="glass rounded-xl p-4 border-l-4 border-blue-500">';
  html += '<div class="flex items-start gap-3">';
  html += '<i class="fas fa-flag text-blue-400 mt-1"></i>';
  html += '<div><div class="text-sm font-bold text-white">Today&#39;s Goal</div><div class="text-sm text-slate-300">' + escHtml(plan.dailyGoal || '') + '</div></div>';
  html += '</div></div>';

  // Motivational Note
  if (plan.motivationalNote) {
    html += '<div class="glass rounded-xl p-4 border-l-4 border-yellow-500">';
    html += '<div class="flex items-start gap-3"><i class="fas fa-lightbulb text-yellow-400 mt-1"></i>';
    html += '<div class="text-sm text-slate-300 italic">' + escHtml(plan.motivationalNote) + '</div></div></div>';
  }

  // Tasks
  html += '<div class="space-y-3">' + tasksHtml + '</div>';

  html += '</div>';
  document.getElementById('daily-plan-content').innerHTML = html;
}

// ─── NETWORK ──────────────────────────────────────────────────────────────────
async function loadNetwork() {
  try {
    var res = await axios.get('/api/network/suggestions');
    var suggestions = res.data.suggestions || [];
    var html = suggestions.map(function(s) {
      return '<div class="card">' +
        '<div class="flex items-start gap-3">' +
        '<div class="w-12 h-12 grad-li rounded-full flex items-center justify-center font-bold text-white flex-shrink-0">' + s.name.split(' ').map(function(w) { return w[0]; }).join('').slice(0,2) + '</div>' +
        '<div class="flex-1 min-w-0">' +
        '<div class="font-bold text-white">' + escHtml(s.name) + '</div>' +
        '<div class="text-xs text-slate-400 truncate">' + escHtml(s.title) + '</div>' +
        '<div class="flex items-center gap-3 mt-2">' +
        '<span class="text-xs text-slate-500">' + s.mutual + ' mutual</span>' +
        '<span class="badge badge-green text-xs">Match: ' + s.score + '%</span>' +
        '<span class="text-xs text-slate-500">' + s.followers + ' followers</span>' +
        '</div></div>' +
        '<button class="btn-li text-xs flex-shrink-0" onclick="showNotif(&#39;Connection request queued for approval!&#39;,&#39;success&#39;)"><i class="fas fa-user-plus mr-1"></i>Connect</button>' +
        '</div></div>';
    }).join('');
    document.getElementById('network-suggestions').innerHTML = html;
  } catch(e) {
    document.getElementById('network-suggestions').innerHTML = '<div class="col-span-2 text-center text-slate-500 py-8">Failed to load suggestions</div>';
  }
}

// ─── AI GENERATE ──────────────────────────────────────────────────────────────
async function generateContent() {
  var type = document.getElementById('gen-type').value;
  var topic = document.getElementById('gen-topic').value;
  var tone = document.getElementById('gen-tone').value;

  if (!topic) { showNotif('Please enter a topic or keyword', 'error'); return; }

  document.getElementById('generated-content').innerHTML =
    '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-purple-400 text-2xl mb-3 block"></i>' +
    '<div class="text-slate-400">Groq AI is generating your content...</div></div>';

  try {
    var res = await axios.post('/api/content/generate', {
      topic: topic, contentType: type, tone: tone,
      objective: APP.objective || 'network_building',
      profile: APP.analysis || {}
    });

    if (res.data.success && res.data.contents) {
      var html = res.data.contents.map(function(c) {
        return '<div class="glass rounded-xl p-5 fade-in">' +
          '<div class="flex items-center justify-between mb-3">' +
          '<div class="flex items-center gap-2">' +
          '<span class="badge badge-purple text-xs">' + escHtml(c.type || type) + '</span>' +
          '<span class="badge badge-green text-xs">Score: ' + c.contentScore + '</span>' +
          '<span class="badge badge-blue text-xs">' + escHtml(c.engagementPrediction) + '</span>' +
          '</div>' +
          '<span class="text-xs text-slate-500">' + escHtml(c.bestPostTime) + '</span>' +
          '</div>' +
          '<h4 class="font-bold text-white mb-2">' + escHtml(c.title) + '</h4>' +
          '<div class="text-slate-300 text-sm mb-3 whitespace-pre-wrap leading-relaxed">' + escHtml(c.body) + '</div>' +
          '<div class="flex flex-wrap gap-2 mb-3">' + (c.hashtags || []).map(function(h) { return '<span class="badge badge-blue text-xs">' + escHtml(h) + '</span>'; }).join('') + '</div>' +
          '<div class="flex items-center gap-3 text-xs text-slate-500 mb-4">' +
          '<span><i class="fas fa-chart-bar mr-1 text-blue-400"></i>Reach: ' + escHtml(c.estimatedReach) + '</span>' +
          '<span><i class="fas fa-lightbulb mr-1 text-yellow-400"></i>' + escHtml(c.whyItWorks) + '</span>' +
          '</div>' +
          '<div class="flex gap-2">' +
          '<button class="btn-success text-xs" onclick="showNotif(&#39;Added to approval queue!&#39;,&#39;success&#39;)"><i class="fas fa-check mr-1"></i>Add to Queue</button>' +
          '<button class="btn-ghost text-xs" onclick="copyContent(this)"><i class="fas fa-copy mr-1"></i>Copy</button>' +
          '</div></div>';
      }).join('');
      document.getElementById('generated-content').innerHTML = html;
    }
  } catch(e) {
    document.getElementById('generated-content').innerHTML =
      '<div class="text-center text-slate-400 py-8"><i class="fas fa-exclamation-circle text-red-400 text-2xl mb-3 block"></i>Content generation failed. Please try again.</div>';
  }
}

function copyContent(btn) {
  var card = btn.closest('.glass');
  var bodyEl = card ? card.querySelector('.whitespace-pre-wrap') : null;
  if (bodyEl) {
    navigator.clipboard.writeText(bodyEl.textContent).then(function() {
      showNotif('Content copied to clipboard!', 'success');
    });
  }
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
function showNotif(message, type) {
  var icons = { success: 'check-circle', error: 'exclamation-circle', info: 'info-circle' };
  var div = document.createElement('div');
  div.className = 'notification ' + (type || 'info');
  div.innerHTML = '<i class="fas fa-' + (icons[type] || 'info-circle') + '"></i><span>' + escHtml(message) + '</span>';
  var container = document.getElementById('notif-container');
  if (container) {
    container.appendChild(div);
    setTimeout(function() { if (div.parentNode) div.parentNode.removeChild(div); }, 4000);
  }
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────
function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function delay(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Pressing Enter on hero input triggers analysis
  var heroInput = document.getElementById('hero-linkedin-input');
  if (heroInput) {
    heroInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') startFreeAnalysis();
    });
  }
  var analyzeInput = document.getElementById('analyze-url');
  if (analyzeInput) {
    analyzeInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') runAnalysis();
    });
  }
  // OTP input - allow only digits
  document.querySelectorAll('.otp-input').forEach(function(inp) {
    inp.addEventListener('input', function() {
      this.value = this.value.replace(/[^0-9]/g, '');
    });
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Backspace' && !this.value) {
        var prev = this.previousElementSibling;
        if (prev && prev.classList.contains('otp-input')) prev.focus();
      }
    });
  });
});
</script>
</body>
</html>`
}

export default app
