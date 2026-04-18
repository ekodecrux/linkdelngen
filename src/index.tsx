import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono()

app.use('*', cors())
app.use('/static/*', serveStatic({ root: './' }))

// ─── API: Auth & User Profile ───────────────────────────────────────────────
app.post('/api/auth/connect', async (c) => {
  const body = await c.req.json()
  const { linkedinId, name, headline, profileUrl } = body
  return c.json({
    success: true,
    user: {
      id: 'user_' + Date.now(),
      linkedinId,
      name: name || 'LinkedIn User',
      headline: headline || '',
      profileUrl: profileUrl || `https://linkedin.com/in/${linkedinId}`,
      connectedAt: new Date().toISOString()
    }
  })
})

// ─── API: Objectives & Strategy ─────────────────────────────────────────────
app.post('/api/strategy/generate', async (c) => {
  const body = await c.req.json()
  const { objective, currentFollowers, industry, targetAudience, linkedinId } = body

  const strategies: Record<string, any> = {
    job_search: {
      title: 'Job Search & Career Pivot Strategy',
      icon: '🎯',
      color: '#4F46E5',
      description: 'Optimized for maximum recruiter visibility and job opportunities',
      kpis: [
        { metric: 'Profile Views', target: '500+/week', current: 45, targetVal: 500 },
        { metric: 'Recruiter Contacts', target: '10+/month', current: 0, targetVal: 10 },
        { metric: 'Connection Acceptance Rate', target: '60%+', current: 30, targetVal: 60 },
        { metric: 'Post Impressions', target: '5K+/week', current: 200, targetVal: 5000 }
      ],
      monthlyPlan: generateMonthlyPlan('job_search'),
      contentPillars: [
        { name: 'Skills Showcase', percentage: 35, icon: '💡', color: '#10B981' },
        { name: 'Industry Insights', percentage: 25, icon: '📊', color: '#3B82F6' },
        { name: 'Career Journey', percentage: 20, icon: '🚀', color: '#F59E0B' },
        { name: 'Thought Leadership', percentage: 20, icon: '✍️', color: '#EF4444' }
      ],
      weeklyActions: getWeeklyActions('job_search'),
      targetPersonas: ['Recruiters', 'Hiring Managers', 'Industry Peers', 'Potential Colleagues']
    },
    network_building: {
      title: 'Network Building & Community Strategy',
      icon: '🌐',
      color: '#059669',
      description: 'Focus on growing a high-quality, engaged professional network',
      kpis: [
        { metric: 'New Connections', target: '100+/month', current: 10, targetVal: 100 },
        { metric: 'Follower Growth', target: '500+/month', current: currentFollowers || 200, targetVal: (currentFollowers || 200) + 500 },
        { metric: 'Engagement Rate', target: '5%+', current: 1.2, targetVal: 5 },
        { metric: 'Comments Received', target: '50+/week', current: 5, targetVal: 50 }
      ],
      monthlyPlan: generateMonthlyPlan('network_building'),
      contentPillars: [
        { name: 'Value-Add Content', percentage: 40, icon: '🎁', color: '#10B981' },
        { name: 'Community Stories', percentage: 25, icon: '📖', color: '#3B82F6' },
        { name: 'Collaborations', percentage: 20, icon: '🤝', color: '#F59E0B' },
        { name: 'Trending Topics', percentage: 15, icon: '🔥', color: '#EF4444' }
      ],
      weeklyActions: getWeeklyActions('network_building'),
      targetPersonas: ['Industry Leaders', 'Peers', 'Community Champions', 'Influencers']
    },
    cxo_positioning: {
      title: 'C-Suite Executive Brand Strategy',
      icon: '👑',
      color: '#7C3AED',
      description: 'Position yourself as a visionary leader and industry authority',
      kpis: [
        { metric: 'Thought Leadership Score', target: 'Top 1%', current: 15, targetVal: 99 },
        { metric: 'Article Reads', target: '10K+/month', current: 100, targetVal: 10000 },
        { metric: 'Speaking Invitations', target: '2+/quarter', current: 0, targetVal: 2 },
        { metric: 'Media Mentions', target: '5+/month', current: 0, targetVal: 5 }
      ],
      monthlyPlan: generateMonthlyPlan('cxo_positioning'),
      contentPillars: [
        { name: 'Vision & Strategy', percentage: 35, icon: '🔭', color: '#7C3AED' },
        { name: 'Industry Trends', percentage: 30, icon: '📈', color: '#3B82F6' },
        { name: 'Leadership Lessons', percentage: 20, icon: '🏆', color: '#F59E0B' },
        { name: 'Company Culture', percentage: 15, icon: '🌱', color: '#10B981' }
      ],
      weeklyActions: getWeeklyActions('cxo_positioning'),
      targetPersonas: ['Board Members', 'Investors', 'CEOs/CTOs', 'Industry Media', 'Top Talent']
    },
    customer_acquisition: {
      title: 'Business Development & Customer Acquisition',
      icon: '💼',
      color: '#DC2626',
      description: 'Generate qualified leads and convert your audience to customers',
      kpis: [
        { metric: 'Lead Inquiries', target: '20+/month', current: 0, targetVal: 20 },
        { metric: 'Demo Requests', target: '5+/month', current: 0, targetVal: 5 },
        { metric: 'Content Conversion', target: '3%+', current: 0.1, targetVal: 3 },
        { metric: 'Warm Introductions', target: '10+/month', current: 1, targetVal: 10 }
      ],
      monthlyPlan: generateMonthlyPlan('customer_acquisition'),
      contentPillars: [
        { name: 'Case Studies', percentage: 35, icon: '📋', color: '#DC2626' },
        { name: 'Problem-Solution', percentage: 30, icon: '🔑', color: '#F59E0B' },
        { name: 'Social Proof', percentage: 20, icon: '⭐', color: '#10B981' },
        { name: 'Industry Pain Points', percentage: 15, icon: '💊', color: '#3B82F6' }
      ],
      weeklyActions: getWeeklyActions('customer_acquisition'),
      targetPersonas: ['Decision Makers', 'Procurement Teams', 'Potential Clients', 'Partners']
    },
    funding_leads: {
      title: 'Investor Relations & Funding Strategy',
      icon: '💰',
      color: '#D97706',
      description: 'Build credibility with investors and access funding opportunities',
      kpis: [
        { metric: 'Investor Connections', target: '30+/month', current: 2, targetVal: 30 },
        { metric: 'VC/Angel Follows', target: '50+/month', current: 5, targetVal: 50 },
        { metric: 'Traction Showcase Views', target: '2K+/post', current: 100, targetVal: 2000 },
        { metric: 'Investor Meetings', target: '2+/month', current: 0, targetVal: 2 }
      ],
      monthlyPlan: generateMonthlyPlan('funding_leads'),
      contentPillars: [
        { name: 'Startup Journey', percentage: 30, icon: '🚀', color: '#D97706' },
        { name: 'Market Opportunity', percentage: 25, icon: '📊', color: '#3B82F6' },
        { name: 'Traction & Metrics', percentage: 25, icon: '📈', color: '#10B981' },
        { name: 'Team & Vision', percentage: 20, icon: '👥', color: '#7C3AED' }
      ],
      weeklyActions: getWeeklyActions('funding_leads'),
      targetPersonas: ['VCs', 'Angel Investors', 'Accelerators', 'Co-Founders', 'Advisors']
    }
  }

  const strategy = strategies[objective] || strategies['network_building']

  return c.json({
    success: true,
    objective,
    linkedinId,
    industry,
    targetAudience,
    strategy,
    generatedAt: new Date().toISOString(),
    estimatedTimeToGoal: '6-12 months'
  })
})

// ─── API: Content Generation ─────────────────────────────────────────────────
app.post('/api/content/generate', async (c) => {
  const body = await c.req.json()
  const { contentType, topic, objective, tone, userProfile } = body

  const contents = generateContentBatch(contentType, topic, objective, tone, userProfile)

  return c.json({
    success: true,
    contents,
    generatedAt: new Date().toISOString(),
    status: 'pending_approval'
  })
})

// ─── API: Content Queue ───────────────────────────────────────────────────────
app.get('/api/content/queue', async (c) => {
  return c.json({
    success: true,
    queue: generateContentQueue(),
    stats: {
      pending: 4,
      approved: 6,
      scheduled: 8,
      published: 23,
      rejected: 2
    }
  })
})

app.post('/api/content/approve', async (c) => {
  const body = await c.req.json()
  const { contentId, action, feedback } = body
  return c.json({
    success: true,
    contentId,
    action,
    message: action === 'approve' ? 'Content approved and queued for publishing' : action === 'reject' ? 'Content rejected' : 'Content scheduled for editing',
    scheduledAt: action === 'approve' ? getNextPublishTime() : null
  })
})

// ─── API: Analytics Dashboard ─────────────────────────────────────────────────
app.get('/api/analytics/overview', async (c) => {
  return c.json({
    success: true,
    overview: {
      followers: { current: 2847, change: +234, changePercent: +9.0, trend: 'up' },
      profileViews: { current: 1203, change: +456, changePercent: +61.0, trend: 'up' },
      postImpressions: { current: 28400, change: +8200, changePercent: +40.6, trend: 'up' },
      engagementRate: { current: 4.8, change: +1.2, changePercent: +33.0, trend: 'up' },
      connections: { current: 892, change: +87, changePercent: +10.8, trend: 'up' },
      searchAppearances: { current: 345, change: +120, changePercent: +53.3, trend: 'up' }
    },
    weeklyTrend: generateWeeklyTrend(),
    topPosts: generateTopPosts(),
    audienceInsights: {
      topIndustries: [
        { name: 'Technology', percentage: 34 },
        { name: 'Finance', percentage: 18 },
        { name: 'Healthcare', percentage: 12 },
        { name: 'Consulting', percentage: 10 },
        { name: 'Manufacturing', percentage: 8 }
      ],
      topSeniority: [
        { name: 'Senior Level', percentage: 28 },
        { name: 'Manager', percentage: 24 },
        { name: 'Director', percentage: 18 },
        { name: 'C-Suite', percentage: 12 },
        { name: 'Individual Contributor', percentage: 18 }
      ],
      topLocations: [
        { name: 'San Francisco Bay Area', percentage: 22 },
        { name: 'New York City', percentage: 18 },
        { name: 'London', percentage: 12 },
        { name: 'Bangalore', percentage: 10 },
        { name: 'Chicago', percentage: 8 }
      ]
    }
  })
})

app.get('/api/analytics/goal-progress', async (c) => {
  const objective = c.req.query('objective') || 'network_building'
  return c.json({
    success: true,
    objective,
    overallProgress: 34,
    monthsElapsed: 4,
    totalMonths: 12,
    milestones: generateMilestones(objective),
    projectedCompletion: '8 months at current pace',
    recommendations: generateRecommendations(objective)
  })
})

// ─── API: Automation Schedule ─────────────────────────────────────────────────
app.get('/api/automation/schedule', async (c) => {
  return c.json({
    success: true,
    todaysTasks: generateTodaysTasks(),
    weeklySchedule: generateWeeklySchedule(),
    automationStats: {
      tasksCompleted: 127,
      tasksQueued: 14,
      successRate: 94.2,
      timeSaved: '8.5 hours/week'
    }
  })
})

app.post('/api/automation/run', async (c) => {
  const body = await c.req.json()
  const { taskType } = body
  return c.json({
    success: true,
    taskType,
    status: 'queued',
    estimatedCompletion: '5 minutes',
    message: `${taskType} automation queued successfully`
  })
})

// ─── API: Network ─────────────────────────────────────────────────────────────
app.get('/api/network/suggestions', async (c) => {
  return c.json({
    success: true,
    suggestions: generateNetworkSuggestions(),
    stats: {
      pendingRequests: 12,
      acceptedThisWeek: 8,
      messagedThisWeek: 15
    }
  })
})

// ─── Serve HTML app ──────────────────────────────────────────────────────────
app.get('*', (c) => {
  return c.html(getHtml())
})

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function generateMonthlyPlan(objective: string) {
  const plans: Record<string, any[]> = {
    job_search: [
      { month: 1, title: 'Foundation & Optimization', tasks: ['Optimize LinkedIn profile', 'Define target roles & companies', 'Connect with 50 recruiters', 'Publish 3 skills showcase posts'], milestone: 'Profile SSI Score > 70' },
      { month: 2, title: 'Visibility Boost', tasks: ['Engage with 20 job-related posts daily', 'Share 2 articles on industry trends', 'Join 5 industry groups', 'Request 5 recommendations'], milestone: '200+ profile views/week' },
      { month: 3, title: 'Recruiter Outreach', tasks: ['DM 30 recruiters with personalized notes', 'Publish "Open to Work" signals subtly', 'Attend 2 virtual networking events', 'Comment on 10 hiring manager posts'], milestone: '10 recruiter conversations' },
      { month: 4, title: 'Authority Building', tasks: ['Write 2 thought leadership articles', 'Share career win stories', 'Get featured in industry newsletters', 'Connect with 100 peers'], milestone: '500 followers gained' },
      { month: 5, title: 'Interview Funnel', tasks: ['Direct outreach to 20 target companies', 'Showcase portfolio projects', 'Publish "lessons learned" series', 'Request warm introductions'], milestone: '5+ interview opportunities' },
      { month: 6, title: 'Momentum & Review', tasks: ['Review and adjust strategy', 'Double down on top-performing content', 'Expand to new industry segments', 'Update profile with new achievements'], milestone: 'Job offers review' }
    ],
    network_building: [
      { month: 1, title: 'Network Audit & Goals', tasks: ['Audit existing network quality', 'Identify 100 target connections', 'Publish 3 value-add posts', 'Comment meaningfully on 30 posts'], milestone: '100 new quality connections' },
      { month: 2, title: 'Content Engine Launch', tasks: ['Post 5x/week consistently', 'Launch weekly insight series', 'Start engaging communities', 'Collaborate with 2 peers on content'], milestone: '1K post impressions avg' },
      { month: 3, title: 'Community Leadership', tasks: ['Host LinkedIn Live session', 'Start a LinkedIn Newsletter', 'Feature others in posts (tagging)', 'Respond to all comments <2 hours'], milestone: '500 new followers' },
      { month: 4, title: 'Cross-Platform Amplification', tasks: ['Repurpose content for wider reach', 'Join and contribute to groups', 'Get mentioned in others\' posts', 'Interview industry leaders'], milestone: '5% engagement rate' },
      { month: 5, title: 'Influence & Authority', tasks: ['Publish weekly long-form articles', 'Speak at virtual events', 'Create original research/surveys', 'Build referral relationships'], milestone: '2K followers milestone' },
      { month: 6, title: 'Scale & Systematize', tasks: ['Automate content calendar', 'Build ambassador network', 'Launch collaboration projects', 'Review and set next 6-month goals'], milestone: 'Sustainable growth engine' }
    ],
    cxo_positioning: [
      { month: 1, title: 'Executive Brand Foundation', tasks: ['Professional headshot & banner', 'Craft executive summary', 'Define unique POV and narrative', 'Connect with 50 C-suite executives'], milestone: 'Executive profile live' },
      { month: 2, title: 'Thought Leadership Launch', tasks: ['Publish flagship article on industry vision', 'Share weekly market commentary', 'Engage with top 20 industry leaders', 'Submit to 2 industry publications'], milestone: 'First article 1K reads' },
      { month: 3, title: 'Media & Speaking', tasks: ['Pitch to 5 podcasts', 'Submit for speaking panels', 'Get quoted in trade publications', 'Launch "Leader Conversations" series'], milestone: '1 media appearance' },
      { month: 4, title: 'Board-Level Visibility', tasks: ['Connect with board members', 'Publish governance/strategy insights', 'Get endorsed by recognized names', 'Participate in top industry forums'], milestone: 'Top Voice nomination' },
      { month: 5, title: 'Awards & Recognition', tasks: ['Submit for industry awards', 'Build advisory board profile', 'Commission personal branding PR', 'Expand to international markets'], milestone: 'Industry recognition' },
      { month: 6, title: 'Legacy & Impact', tasks: ['Launch signature content series', 'Mentor program launch', 'Executive community building', 'Annual review & strategy refresh'], milestone: 'Recognized industry voice' }
    ],
    customer_acquisition: [
      { month: 1, title: 'ICP Definition & Setup', tasks: ['Define Ideal Customer Profile', 'Optimize profile for buyer searches', 'Create lead magnet content', 'Build initial prospect list 200+'], milestone: 'First 5 lead inquiries' },
      { month: 2, title: 'Content-Led Demand Gen', tasks: ['Publish 2 detailed case studies', 'Share ROI and success metrics', 'Educational content series launch', 'Engage with potential buyers daily'], milestone: '10 warm conversations' },
      { month: 3, title: 'Social Selling Launch', tasks: ['DM 50 qualified prospects/month', 'Share personalized insights', 'Host solution webinar', 'Gather & showcase testimonials'], milestone: 'First deal closed via LinkedIn' },
      { month: 4, title: 'Partner Ecosystem', tasks: ['Connect with complementary vendors', 'Build referral partnerships', 'Co-create content with partners', 'Launch affiliate/ambassador program'], milestone: '3x referral deals' },
      { month: 5, title: 'Pipeline Acceleration', tasks: ['Account-based content targeting', 'Executive sponsorship outreach', 'Case study video series', 'Proof-point content amplification'], milestone: '20 active opportunities' },
      { month: 6, title: 'Optimize & Scale', tasks: ['A/B test messaging', 'Double down on winning channels', 'Scale outreach automation', 'Build sales-enablement content'], milestone: 'Predictable revenue pipeline' }
    ],
    funding_leads: [
      { month: 1, title: 'Investor Narrative', tasks: ['Craft founder story', 'Define market opportunity clearly', 'Connect with 30 VCs/Angels', 'Publish traction milestone post'], milestone: 'Investor radar presence' },
      { month: 2, title: 'Traction Storytelling', tasks: ['Share monthly metrics publicly', 'Feature customer success stories', 'Publish market research insights', 'Engage with VC partners daily'], milestone: '5 investor conversations' },
      { month: 3, title: 'Warm Introduction Engine', tasks: ['Map VC network connections', 'Get intros through mutual connections', 'Attend and post about events', 'Feature advisors and supporters'], milestone: '10 intro requests' },
      { month: 4, title: 'Credibility & PR', tasks: ['TechCrunch/Forbes guest article', 'Get covered in VC newsletters', 'Publish deep-dive company blog', 'Showcase team and culture'], milestone: '1 press mention' },
      { month: 5, title: 'Deal Flow Creation', tasks: ['AngelList & Crunchbase optimization', 'Publish fundraising journey (tastefully)', 'Engage accelerator communities', 'Share investor updates publicly'], milestone: 'Active term sheet discussions' },
      { month: 6, title: 'Close & Beyond', tasks: ['Share funding announcement strategy', 'Thank and amplify investors', 'Recruit talent via LinkedIn', 'Pivot strategy post-funding'], milestone: 'Funding closed' }
    ]
  }
  return plans[objective] || plans['network_building']
}

function getWeeklyActions(objective: string) {
  const actions: Record<string, any[]> = {
    job_search: [
      { day: 'Mon', actions: ['Post career insight (9am)', 'Connect with 10 recruiters', 'Comment on 5 job posts'] },
      { day: 'Tue', actions: ['Engage with hiring manager posts', 'Update profile section', 'Apply to 5 target roles'] },
      { day: 'Wed', actions: ['Share skills showcase post (10am)', 'Follow 10 target companies', 'Request 1 recommendation'] },
      { day: 'Thu', actions: ['Engage in 2 industry groups', 'DM 3 warm connections', 'Comment on 10 posts'] },
      { day: 'Fri', actions: ['Post week recap/learnings', 'Connect with 5 alumni', 'Review and optimize profile'] },
      { day: 'Sat', actions: ['Engage with weekend posts', 'Research 10 target companies', 'Plan next week content'] },
      { day: 'Sun', actions: ['Content batch creation', 'Set weekly intentions', 'Review analytics'] }
    ],
    network_building: [
      { day: 'Mon', actions: ['Post thought piece (8am)', 'Connect with 15 new people', 'Comment on 10 posts'] },
      { day: 'Tue', actions: ['Engage with community', 'Share curated content', 'Reply to all comments'] },
      { day: 'Wed', actions: ['Publish mid-week insight (10am)', 'Host/join group discussion', 'Feature a connection in post'] },
      { day: 'Thu', actions: ['Share trending industry news', 'Send 5 personalized DMs', 'Engage with influencers'] },
      { day: 'Fri', actions: ['Post success story (9am)', 'Connect with 10 new profiles', 'Review week performance'] },
      { day: 'Sat', actions: ['Lighter engagement', 'Content research', 'Respond to pending messages'] },
      { day: 'Sun', actions: ['Plan upcoming week', 'Batch content creation', 'Analytics review'] }
    ]
  }
  return actions[objective] || actions['network_building']
}

function generateContentBatch(contentType: string, topic: string, objective: string, tone: string, userProfile: any) {
  const templates = [
    {
      id: 'c1',
      type: 'post',
      topic: topic || 'Professional Growth',
      content: '3 things I wish someone told me earlier about ' + (topic || 'professional growth') + ':\n\n1. Your network is your net worth - but only if you genuinely invest in others first.\n\n2. Consistency beats perfection every single time. Show up daily, even when it\'s imperfect.\n\n3. The best opportunities come to those who make themselves easy to find online.\n\nWhat would you add? Drop it in the comments!\n\n#ProfessionalGrowth #CareerAdvice #LinkedIn #PersonalBrand',
      estimatedReach: '2,400 - 4,800',
      bestPostTime: 'Tuesday 8:00 AM',
      engagementPrediction: 'High',
      contentScore: 87,
      tags: ['#ProfessionalGrowth', '#CareerAdvice', '#LinkedIn'],
      status: 'pending'
    },
    {
      id: 'c2',
      type: 'article',
      topic: topic || 'Industry Trends',
      content: 'The Future of ' + (topic || 'Our Industry') + ': What Leaders Need to Know in 2025\n\nIn the past 18 months, I have spoken with 200+ executives across the ' + (topic || 'technology') + ' space. Here is what the data and conversations reveal about where we are headed...\n\n[Full article with industry insights, data points, and actionable recommendations for leaders navigating this transformation]',
      estimatedReach: '8,000 - 15,000',
      bestPostTime: 'Wednesday 10:00 AM',
      engagementPrediction: 'Very High',
      contentScore: 92,
      tags: ['#FutureOfWork', '#Leadership', '#Innovation'],
      status: 'pending'
    },
    {
      id: 'c3',
      type: 'story',
      topic: 'Personal Story',
      content: 'I was rejected 47 times before landing my dream role.\n\nThe brutal truth nobody talks about:\n\nMonth 1: 0 callbacks\nMonth 2: 3 rejections\nMonth 3: 12 rejections\nMonth 4: 1 YES that changed everything\n\nWhat changed? I stopped optimizing my resume and started building my brand.\n\nThe companies that rejected me are now reaching out to me.\n\nIf you are in the middle of the grind - do not stop. The compound effect is real.\n\nSave this for when you need it most.\n\n#Resilience #JobSearch #NeverGiveUp',
      estimatedReach: '5,000 - 12,000',
      bestPostTime: 'Monday 7:00 AM',
      engagementPrediction: 'Viral Potential',
      contentScore: 95,
      tags: ['#Resilience', '#JobSearch', '#PersonalBrand'],
      status: 'pending'
    }
  ]
  return templates
}

function generateContentQueue() {
  return [
    { id: 'q1', type: 'Post', topic: 'Industry Insight', scheduledFor: 'Today 8:00 AM', status: 'approved', preview: '3 reasons why AI will not replace...', score: 88 },
    { id: 'q2', type: 'Article', topic: 'Leadership', scheduledFor: 'Tomorrow 10:00 AM', status: 'pending', preview: 'The untold story of scaling...', score: 91 },
    { id: 'q3', type: 'Comment', topic: 'Engagement', scheduledFor: 'Today 2:00 PM', status: 'approved', preview: 'Engage with top 5 industry posts', score: 75 },
    { id: 'q4', type: 'Connection Request', topic: 'Network', scheduledFor: 'Today 11:00 AM', status: 'pending', preview: '15 personalized connection requests to CTOs', score: 82 },
    { id: 'q5', type: 'Repost', topic: 'Amplify', scheduledFor: 'Wed 9:00 AM', status: 'pending', preview: 'Repost: Future of fintech by @JohnDoe', score: 79 },
    { id: 'q6', type: 'DM Campaign', topic: 'Outreach', scheduledFor: 'Thu 10:00 AM', status: 'pending', preview: '10 personalized DMs to hiring managers', score: 85 },
  ]
}

function generateWeeklyTrend() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return days.map((day, i) => ({
    day,
    impressions: Math.floor(3000 + Math.random() * 2000 + i * 500),
    engagement: Math.floor(80 + Math.random() * 120 + i * 20),
    followers: Math.floor(5 + Math.random() * 15)
  }))
}

function generateTopPosts() {
  return [
    { id: 1, content: '3 things I wish I knew about leadership...', type: 'Post', impressions: 12400, likes: 342, comments: 87, shares: 45, date: '3 days ago', engagementRate: 3.8 },
    { id: 2, content: 'The Future of AI in Enterprise: My Take', type: 'Article', impressions: 8900, likes: 234, comments: 156, shares: 89, date: '1 week ago', engagementRate: 5.4 },
    { id: 3, content: 'I was wrong about remote work (here\'s why)...', type: 'Story Post', impressions: 7200, likes: 456, comments: 203, shares: 78, date: '2 weeks ago', engagementRate: 10.2 }
  ]
}

function generateMilestones(objective: string) {
  return [
    { month: 1, title: 'Foundation Built', completed: true, completedDate: 'Jan 15', target: 'Profile optimized, 100 connections added' },
    { month: 2, title: 'Content Engine Live', completed: true, completedDate: 'Feb 20', target: '20 posts published, 500 impressions avg' },
    { month: 3, title: 'Engagement Spike', completed: true, completedDate: 'Mar 18', target: 'Engagement rate > 3%' },
    { month: 4, title: 'Network Breakthrough', completed: false, inProgress: true, target: '500 new followers, 50 key connections' },
    { month: 6, title: 'Thought Leader Status', completed: false, target: 'Regular articles, speaking invites' },
    { month: 9, title: 'Industry Recognition', completed: false, target: 'Media mentions, awards' },
    { month: 12, title: 'Goal Achieved', completed: false, target: 'Full objective completion' }
  ]
}

function generateRecommendations(objective: string) {
  return [
    { priority: 'High', action: 'Increase posting frequency to 5x/week (currently 3x)', impact: '+40% reach' },
    { priority: 'High', action: 'Add video content — video gets 3x more engagement', impact: '+65% engagement' },
    { priority: 'Medium', action: 'Engage with 20 posts before publishing your own', impact: '+25% visibility' },
    { priority: 'Medium', action: 'Reply to every comment within 2 hours of posting', impact: '+50% comment threads' },
    { priority: 'Low', action: 'Optimize posting time to Tue/Wed 8-10am', impact: '+15% impressions' }
  ]
}

function generateTodaysTasks() {
  return [
    { time: '7:30 AM', task: 'Publish scheduled post: "AI in Leadership"', type: 'publish', status: 'completed', automated: true },
    { time: '9:00 AM', task: 'Send 10 personalized connection requests to CTOs', type: 'connect', status: 'completed', automated: true },
    { time: '11:00 AM', task: 'Comment on 5 trending posts in your industry', type: 'engage', status: 'in_progress', automated: true },
    { time: '1:00 PM', task: 'Review & approve tomorrow\'s content queue', type: 'approval', status: 'pending', automated: false, requiresApproval: true },
    { time: '3:00 PM', task: 'Respond to all pending DMs and comments', type: 'respond', status: 'pending', automated: false },
    { time: '5:00 PM', task: 'Repost curated content from industry leaders', type: 'repost', status: 'pending', automated: true },
    { time: '7:00 PM', task: 'Review daily analytics and adjust tomorrow\'s plan', type: 'review', status: 'pending', automated: true }
  ]
}

function generateWeeklySchedule() {
  return {
    Mon: { posts: 1, connections: 15, comments: 10, articles: 0 },
    Tue: { posts: 1, connections: 10, comments: 15, articles: 0 },
    Wed: { posts: 2, connections: 10, comments: 10, articles: 1 },
    Thu: { posts: 1, connections: 15, comments: 10, articles: 0 },
    Fri: { posts: 1, connections: 10, comments: 10, articles: 0 },
    Sat: { posts: 0, connections: 5, comments: 5, articles: 0 },
    Sun: { posts: 1, connections: 5, comments: 5, articles: 0 }
  }
}

function generateNetworkSuggestions() {
  return [
    { name: 'Sarah Chen', title: 'CTO at TechVentures', mutual: 12, reason: 'Shares your interest in AI Leadership', relevanceScore: 94, company: 'TechVentures', followers: '12K' },
    { name: 'Marcus Johnson', title: 'VP Engineering at Scale AI', mutual: 8, reason: 'Active in your target industry', relevanceScore: 91, company: 'Scale AI', followers: '8.2K' },
    { name: 'Priya Sharma', title: 'Founder & CEO at FutureWork', mutual: 15, reason: 'Frequently engages with your content topics', relevanceScore: 89, company: 'FutureWork', followers: '22K' },
    { name: 'David Williams', title: 'Partner at Sequoia Capital', mutual: 3, reason: 'Investor relevant to your objective', relevanceScore: 88, company: 'Sequoia Capital', followers: '45K' },
    { name: 'Lisa Rodriguez', title: 'Head of Talent at Google', mutual: 6, reason: 'Key connector in your target network', relevanceScore: 85, company: 'Google', followers: '18K' }
  ]
}

function getNextPublishTime() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(8, 0, 0, 0)
  return tomorrow.toISOString()
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HTML APPLICATION
// ═══════════════════════════════════════════════════════════════════════════

function getHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>LinkedBoost AI – Personal Branding Agent</title>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css"/>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
  body { background: #0f172a; color: #e2e8f0; margin: 0; overflow-x: hidden; }

  /* Scrollbars */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #1e293b; }
  ::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }

  /* Glassmorphism */
  .glass { background: rgba(30,41,59,0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); }
  .glass-dark { background: rgba(15,23,42,0.8); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.05); }

  /* Gradients */
  .grad-linkedin { background: linear-gradient(135deg, #0077B5 0%, #00A0DC 100%); }
  .grad-purple { background: linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%); }
  .grad-green { background: linear-gradient(135deg, #059669 0%, #10B981 100%); }
  .grad-orange { background: linear-gradient(135deg, #D97706 0%, #F59E0B 100%); }
  .grad-red { background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%); }
  .grad-dark { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); }

  /* Sidebar */
  .sidebar { width: 260px; min-height: 100vh; background: rgba(15,23,42,0.95); border-right: 1px solid rgba(255,255,255,0.06); transition: all 0.3s; }
  .nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-radius: 10px; cursor: pointer; transition: all 0.2s; color: #94a3b8; font-size: 14px; margin-bottom: 2px; }
  .nav-item:hover { background: rgba(255,255,255,0.05); color: #e2e8f0; }
  .nav-item.active { background: linear-gradient(135deg, rgba(0,119,181,0.3), rgba(0,160,220,0.15)); color: #38bdf8; border-left: 3px solid #0077B5; }
  .nav-item i { width: 20px; text-align: center; }

  /* Cards */
  .metric-card { background: rgba(30,41,59,0.6); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 20px; transition: all 0.2s; }
  .metric-card:hover { border-color: rgba(0,119,181,0.4); transform: translateY(-2px); }
  .content-card { background: rgba(30,41,59,0.5); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; margin-bottom: 12px; transition: all 0.2s; }
  .content-card:hover { border-color: rgba(0,119,181,0.3); }

  /* Buttons */
  .btn-primary { background: linear-gradient(135deg, #0077B5, #00A0DC); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; }
  .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 15px rgba(0,119,181,0.4); }
  .btn-success { background: linear-gradient(135deg, #059669, #10B981); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; }
  .btn-danger { background: linear-gradient(135deg, #DC2626, #EF4444); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; }
  .btn-ghost { background: rgba(255,255,255,0.06); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
  .btn-ghost:hover { background: rgba(255,255,255,0.1); color: white; }

  /* Badges */
  .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .badge-blue { background: rgba(59,130,246,0.2); color: #60a5fa; }
  .badge-green { background: rgba(16,185,129,0.2); color: #34d399; }
  .badge-yellow { background: rgba(245,158,11,0.2); color: #fbbf24; }
  .badge-red { background: rgba(239,68,68,0.2); color: #f87171; }
  .badge-purple { background: rgba(124,58,237,0.2); color: #a78bfa; }

  /* Progress */
  .progress-bar { background: rgba(255,255,255,0.08); border-radius: 99px; overflow: hidden; height: 6px; }
  .progress-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #0077B5, #00A0DC); transition: width 1s ease; }

  /* Onboarding */
  .onboarding-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: radial-gradient(ellipse at top, rgba(0,119,181,0.15) 0%, #0f172a 70%); }
  .objective-card { border: 2px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 20px; cursor: pointer; transition: all 0.3s; background: rgba(30,41,59,0.4); }
  .objective-card:hover { border-color: rgba(0,119,181,0.5); background: rgba(0,119,181,0.1); transform: translateY(-3px); }
  .objective-card.selected { border-color: #0077B5; background: rgba(0,119,181,0.2); box-shadow: 0 0 20px rgba(0,119,181,0.3); }

  /* Animations */
  @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse-dot { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.7; } }
  @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes spin-slow { to { transform: rotate(360deg); } }
  .fade-in { animation: fadeIn 0.5s ease forwards; }
  .slide-in { animation: slideIn 0.4s ease forwards; }
  .pulse-dot { animation: pulse-dot 2s infinite; }

  /* AI typing animation */
  .typing-cursor::after { content: '|'; animation: blink 1s infinite; }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

  /* Toast */
  .toast { position: fixed; bottom: 24px; right: 24px; z-index: 9999; padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 500; animation: fadeIn 0.3s ease; }
  .toast-success { background: rgba(16,185,129,0.9); color: white; }
  .toast-error { background: rgba(239,68,68,0.9); color: white; }
  .toast-info { background: rgba(59,130,246,0.9); color: white; }

  /* LinkedIn Profile Mock */
  .profile-mock { background: linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%); border-radius: 12px; overflow: hidden; }

  /* Approval inbox special */
  .approval-item { border-left: 4px solid transparent; padding: 16px; background: rgba(30,41,59,0.5); border-radius: 12px; margin-bottom: 12px; transition: all 0.2s; }
  .approval-item.high { border-left-color: #f59e0b; }
  .approval-item.medium { border-left-color: #0077B5; }
  .approval-item.low { border-left-color: #6b7280; }
  .approval-item:hover { background: rgba(30,41,59,0.8); }

  /* Donut chart labels */
  .donut-label { font-size: 24px; font-weight: 800; fill: #e2e8f0; }
  .donut-sublabel { font-size: 12px; fill: #94a3b8; }

  /* Timeline */
  .timeline-item { display: flex; gap: 16px; position: relative; }
  .timeline-line { position: absolute; left: 19px; top: 40px; bottom: 0; width: 2px; background: rgba(255,255,255,0.08); }
  .timeline-dot { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 16px; }

  /* Responsive */
  @media (max-width: 768px) {
    .sidebar { width: 70px; }
    .sidebar .nav-label { display: none; }
    .sidebar .logo-text { display: none; }
    .main-content { margin-left: 70px !important; }
  }

  .main-content { margin-left: 260px; }
  .tab-active { border-bottom: 2px solid #0077B5; color: #38bdf8; }

  /* AI Score Ring */
  .score-ring { position: relative; display: inline-flex; align-items: center; justify-content: center; }
  svg.ring-chart circle { fill: none; stroke-width: 8; stroke-linecap: round; transition: stroke-dashoffset 1s ease; }

  /* Glow effects */
  .glow-blue { box-shadow: 0 0 20px rgba(0, 119, 181, 0.3); }
  .glow-green { box-shadow: 0 0 20px rgba(16, 185, 129, 0.3); }
  .glow-purple { box-shadow: 0 0 20px rgba(124, 58, 237, 0.3); }
</style>
</head>
<body>

<div id="app">
  <!-- Dynamically rendered by JavaScript -->
</div>

<div id="toast-container"></div>

<script>
// ═══════════════════════════════════════════════════════════════════════════
// APP STATE
// ═══════════════════════════════════════════════════════════════════════════
const STATE = {
  screen: 'onboarding', // onboarding | setup | strategy | dashboard
  step: 1, // onboarding steps: 1=connect, 2=objective, 3=profile, 4=generating
  user: null,
  objective: null,
  strategy: null,
  activeTab: 'overview',
  contentQueue: [],
  analytics: null,
  notifications: 3
};

const OBJECTIVES = [
  { id: 'job_search', icon: '🎯', label: 'Job Seeking', desc: 'Get discovered by recruiters & land dream roles', color: '#4F46E5' },
  { id: 'network_building', icon: '🌐', label: 'Network Building', desc: 'Grow an engaged, high-quality professional network', color: '#059669' },
  { id: 'cxo_positioning', icon: '👑', label: 'C-Suite / Executive', desc: 'Position as industry thought leader & visionary', color: '#7C3AED' },
  { id: 'customer_acquisition', icon: '💼', label: 'Bring Customers', desc: 'Generate leads & convert LinkedIn to revenue', color: '#DC2626' },
  { id: 'funding_leads', icon: '💰', label: 'Funding / Investors', desc: 'Connect with VCs, angels & funding sources', color: '#D97706' }
];

// ═══════════════════════════════════════════════════════════════════════════
// ROUTER / RENDERER
// ═══════════════════════════════════════════════════════════════════════════
function render() {
  const app = document.getElementById('app');
  if (STATE.screen === 'onboarding') {
    app.innerHTML = renderOnboarding();
  } else if (STATE.screen === 'strategy') {
    app.innerHTML = renderStrategyPreview();
  } else {
    app.innerHTML = renderDashboard();
  }
  attachEvents();
}

// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING
// ═══════════════════════════════════════════════════════════════════════════
function renderOnboarding() {
  const steps = [
    { num: 1, label: 'Connect LinkedIn' },
    { num: 2, label: 'Set Objective' },
    { num: 3, label: 'Profile Setup' },
    { num: 4, label: 'Generate Plan' }
  ];

  let content = '';
  if (STATE.step === 1) content = renderStep1();
  else if (STATE.step === 2) content = renderStep2();
  else if (STATE.step === 3) content = renderStep3();
  else if (STATE.step === 4) content = renderStep4();

  return \`
  <div class="onboarding-screen">
    <div class="w-full max-w-2xl px-4">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center gap-3 mb-3">
          <div class="w-12 h-12 grad-linkedin rounded-xl flex items-center justify-center text-2xl">🚀</div>
          <div class="text-left">
            <div class="text-2xl font-bold text-white">LinkedBoost <span class="text-blue-400">AI</span></div>
            <div class="text-xs text-slate-400">Personal Branding Agent</div>
          </div>
        </div>
      </div>

      <!-- Step Progress -->
      <div class="flex items-center justify-center gap-2 mb-8">
        \${steps.map((s, i) => \`
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1">
              <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold \${STATE.step > s.num ? 'bg-green-500 text-white' : STATE.step === s.num ? 'grad-linkedin text-white' : 'bg-slate-700 text-slate-400'}">
                \${STATE.step > s.num ? '<i class="fas fa-check text-xs"></i>' : s.num}
              </div>
              <span class="text-xs \${STATE.step === s.num ? 'text-blue-400 font-semibold' : 'text-slate-500'} hidden sm:block">\${s.label}</span>
            </div>
            \${i < steps.length - 1 ? '<div class="w-8 h-px bg-slate-600 mx-1"></div>' : ''}
          </div>
        \`).join('')}
      </div>

      <!-- Step Content -->
      <div class="glass rounded-2xl p-8 fade-in">
        \${content}
      </div>
    </div>
  </div>
  \`;
}

function renderStep1() {
  return \`
    <div class="text-center mb-6">
      <div class="w-16 h-16 grad-linkedin rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
        <i class="fab fa-linkedin text-white text-3xl"></i>
      </div>
      <h2 class="text-2xl font-bold text-white mb-2">Connect Your LinkedIn</h2>
      <p class="text-slate-400 text-sm">Enter your LinkedIn profile details to get started with your personal branding journey</p>
    </div>

    <div class="space-y-4">
      <div>
        <label class="text-sm text-slate-400 block mb-1.5">LinkedIn Profile ID / Username <span class="text-red-400">*</span></label>
        <div class="relative">
          <span class="absolute left-3 top-3 text-slate-500 text-sm">linkedin.com/in/</span>
          <input id="inp-linkedin-id" type="text" placeholder="john-doe" class="w-full bg-slate-800/50 border border-slate-700 rounded-10 px-3 py-3 pl-32 text-white text-sm rounded-lg focus:outline-none focus:border-blue-500" style="padding-left: 130px;" />
        </div>
      </div>

      <div>
        <label class="text-sm text-slate-400 block mb-1.5">Full Name <span class="text-red-400">*</span></label>
        <input id="inp-name" type="text" placeholder="John Doe" class="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>

      <div>
        <label class="text-sm text-slate-400 block mb-1.5">Professional Headline</label>
        <input id="inp-headline" type="text" placeholder="CEO at TechCorp | AI Enthusiast | Speaker" class="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>

      <div>
        <label class="text-sm text-slate-400 block mb-1.5">Industry</label>
        <select id="inp-industry" class="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500">
          <option value="">Select your industry...</option>
          <option>Technology</option><option>Finance & Banking</option><option>Healthcare</option>
          <option>Consulting</option><option>Marketing & Advertising</option><option>Manufacturing</option>
          <option>Education</option><option>Real Estate</option><option>Retail & E-commerce</option><option>Other</option>
        </select>
      </div>

      <div>
        <label class="text-sm text-slate-400 block mb-1.5">Current Followers Count</label>
        <input id="inp-followers" type="number" placeholder="e.g. 1250" class="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>
    </div>

    <div class="flex gap-3 mt-6">
      <button onclick="nextStep()" class="btn-primary w-full py-3 text-base">
        <i class="fas fa-arrow-right mr-2"></i>Continue
      </button>
    </div>

    <p class="text-xs text-slate-500 text-center mt-4">
      <i class="fas fa-lock mr-1"></i>Your data is secure. We never store LinkedIn passwords.
    </p>
  \`;
}

function renderStep2() {
  return \`
    <div class="text-center mb-6">
      <h2 class="text-2xl font-bold text-white mb-2">What's Your Goal?</h2>
      <p class="text-slate-400 text-sm">Choose your primary objective — AI will build a personalized 12-month strategy</p>
    </div>

    <div class="grid grid-cols-1 gap-3" id="objectives-grid">
      \${OBJECTIVES.map(obj => \`
        <div class="objective-card \${STATE.objective === obj.id ? 'selected' : ''}" onclick="selectObjective('\${obj.id}')">
          <div class="flex items-center gap-3">
            <span class="text-2xl">\${obj.icon}</span>
            <div class="flex-1">
              <div class="font-semibold text-white text-sm">\${obj.label}</div>
              <div class="text-xs text-slate-400 mt-0.5">\${obj.desc}</div>
            </div>
            <div class="w-5 h-5 rounded-full border-2 \${STATE.objective === obj.id ? 'border-blue-500 bg-blue-500' : 'border-slate-600'} flex items-center justify-center flex-shrink-0">
              \${STATE.objective === obj.id ? '<i class="fas fa-check text-white text-xs"></i>' : ''}
            </div>
          </div>
        </div>
      \`).join('')}
    </div>

    <div class="flex gap-3 mt-6">
      <button onclick="prevStep()" class="btn-ghost flex-1 py-3">
        <i class="fas fa-arrow-left mr-2"></i>Back
      </button>
      <button onclick="nextStep()" class="btn-primary flex-1 py-3 \${!STATE.objective ? 'opacity-50 cursor-not-allowed' : ''}">
        Continue<i class="fas fa-arrow-right ml-2"></i>
      </button>
    </div>
  \`;
}

function renderStep3() {
  return \`
    <div class="text-center mb-6">
      <h2 class="text-2xl font-bold text-white mb-2">Customize Your Brand Voice</h2>
      <p class="text-slate-400 text-sm">Help AI understand your style for hyper-personalized content</p>
    </div>

    <div class="space-y-4">
      <div>
        <label class="text-sm text-slate-400 block mb-1.5">Content Tone</label>
        <div class="grid grid-cols-2 gap-2" id="tone-grid">
          \${['Professional', 'Conversational', 'Inspirational', 'Data-Driven', 'Storytelling', 'Bold & Direct'].map(t => \`
            <div onclick="selectTone('\${t}')" class="tone-btn objective-card text-center py-2 text-sm text-white cursor-pointer rounded-lg \${STATE.tone === t ? 'selected' : ''}">
              \${t}
            </div>
          \`).join('')}
        </div>
      </div>

      <div>
        <label class="text-sm text-slate-400 block mb-1.5">Target Audience (who do you want to reach?)</label>
        <input id="inp-audience" type="text" placeholder="e.g. Tech founders, VCs, Senior Engineers" class="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>

      <div>
        <label class="text-sm text-slate-400 block mb-1.5">Your Key Expertise / Superpowers</label>
        <textarea id="inp-expertise" rows="3" placeholder="e.g. SaaS growth, AI product development, Team building, Financial modeling..." class="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"></textarea>
      </div>

      <div>
        <label class="text-sm text-slate-400 block mb-1.5">Preferred Posting Frequency</label>
        <select id="inp-frequency" class="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500">
          <option>3x per week (Starter)</option>
          <option selected>5x per week (Recommended)</option>
          <option>7x per week (Aggressive)</option>
          <option>Daily + Articles (Power User)</option>
        </select>
      </div>
    </div>

    <div class="flex gap-3 mt-6">
      <button onclick="prevStep()" class="btn-ghost flex-1 py-3">
        <i class="fas fa-arrow-left mr-2"></i>Back
      </button>
      <button onclick="nextStep()" class="btn-primary flex-1 py-3">
        Generate My Strategy<i class="fas fa-magic ml-2"></i>
      </button>
    </div>
  \`;
}

function renderStep4() {
  const obj = OBJECTIVES.find(o => o.id === STATE.objective);
  const messages = [
    '🧠 Analyzing your LinkedIn profile...',
    '📊 Processing industry benchmarks...',
    '🎯 Calibrating to your objective...',
    '📅 Building 12-month roadmap...',
    '✍️ Crafting content strategy...',
    '🚀 Finalizing your personal brand plan...'
  ];

  setTimeout(() => {
    generateStrategy();
  }, 4000);

  return \`
    <div class="text-center py-8">
      <div class="relative w-24 h-24 mx-auto mb-6">
        <svg class="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="14" stroke="rgba(255,255,255,0.08)" stroke-width="3" fill="none"/>
          <circle id="progress-ring" cx="18" cy="18" r="14" stroke="#0077B5" stroke-width="3" fill="none"
            stroke-dasharray="88" stroke-dashoffset="88" stroke-linecap="round" style="transition: stroke-dashoffset 3.5s ease;"/>
        </svg>
        <div class="absolute inset-0 flex items-center justify-center text-3xl">🤖</div>
      </div>
      <div class="text-xl font-bold text-white mb-2">Generating Your Strategy</div>
      <div id="ai-status" class="text-sm text-blue-400 typing-cursor mb-6">\${messages[0]}</div>

      <div class="space-y-2 max-w-xs mx-auto">
        \${messages.map((m, i) => \`
          <div id="step-msg-\${i}" class="flex items-center gap-2 text-xs \${i === 0 ? 'text-slate-300' : 'text-slate-600'} transition-colors">
            <div id="step-icon-\${i}" class="w-4 h-4 rounded-full \${i === 0 ? 'bg-blue-500' : 'bg-slate-700'} flex items-center justify-center text-xs flex-shrink-0">
              \${i === 0 ? '<i class="fas fa-spinner fa-spin text-white" style="font-size:8px"></i>' : '<span style="font-size:9px; color: #64748b">' + (i+1) + '</span>'}
            </div>
            <span>\${m}</span>
          </div>
        \`).join('')}
      </div>
    </div>
  \`;
}

// ═══════════════════════════════════════════════════════════════════════════
// STRATEGY PREVIEW
// ═══════════════════════════════════════════════════════════════════════════
function renderStrategyPreview() {
  const s = STATE.strategy;
  if (!s) return '<div class="p-8 text-center text-slate-400">Loading strategy...</div>';
  const obj = OBJECTIVES.find(o => o.id === STATE.objective);

  return \`
  <div class="min-h-screen" style="background: radial-gradient(ellipse at top, rgba(0,119,181,0.12) 0%, #0f172a 60%);">
    <!-- Header -->
    <div class="glass-dark border-b border-white/5 px-8 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 grad-linkedin rounded-xl flex items-center justify-center text-lg">🚀</div>
        <div>
          <div class="font-bold text-white">LinkedBoost AI</div>
          <div class="text-xs text-slate-400">Strategy Ready</div>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="badge badge-green"><span class="pulse-dot w-2 h-2 bg-green-400 rounded-full inline-block"></span> AI Plan Generated</div>
        <button onclick="enterDashboard()" class="btn-primary">
          Launch Dashboard <i class="fas fa-arrow-right ml-2"></i>
        </button>
      </div>
    </div>

    <div class="max-w-5xl mx-auto px-6 py-8">
      <!-- Strategy Header Card -->
      <div class="glass rounded-2xl p-8 mb-6 fade-in" style="border-color: rgba(0,119,181,0.3);">
        <div class="flex flex-col md:flex-row items-start gap-6">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-3">
              <span class="text-4xl">\${obj?.icon}</span>
              <div>
                <div class="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-1">Your Personal Brand Strategy</div>
                <h1 class="text-2xl font-bold text-white">\${s.strategy?.title}</h1>
              </div>
            </div>
            <p class="text-slate-400 text-sm mb-4">\${s.strategy?.description}</p>
            <div class="flex flex-wrap gap-2">
              \${(s.strategy?.targetPersonas || []).map(p => \`<span class="badge badge-blue">\${p}</span>\`).join('')}
            </div>
          </div>
          <div class="glass-dark rounded-xl p-4 min-w-48 text-center">
            <div class="text-4xl font-black text-white mb-1">12</div>
            <div class="text-xs text-slate-400">Month Plan</div>
            <div class="w-px h-3 bg-slate-600 mx-auto my-2"></div>
            <div class="text-2xl font-bold text-green-400 mb-1">97%</div>
            <div class="text-xs text-slate-400">AI Confidence</div>
          </div>
        </div>
      </div>

      <!-- KPIs -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        \${(s.strategy?.kpis || []).map(kpi => \`
          <div class="metric-card fade-in text-center">
            <div class="text-xs text-slate-500 mb-2">\${kpi.metric}</div>
            <div class="text-xl font-bold text-blue-400 mb-1">\${kpi.target}</div>
            <div class="text-xs text-slate-500">Current: \${kpi.current}\${typeof kpi.current === 'number' && kpi.current < 100 ? '' : ''}</div>
          </div>
        \`).join('')}
      </div>

      <!-- Content Pillars + Monthly Plan -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <!-- Content Pillars -->
        <div class="glass rounded-xl p-6">
          <h3 class="font-semibold text-white mb-4">📌 Content Pillars</h3>
          <div class="space-y-3">
            \${(s.strategy?.contentPillars || []).map(p => \`
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-slate-300 flex items-center gap-2"><span>\${p.icon}</span> \${p.name}</span>
                  <span class="font-semibold text-white">\${p.percentage}%</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width:\${p.percentage}%; background: \${p.color};"></div>
                </div>
              </div>
            \`).join('')}
          </div>
        </div>

        <!-- First Month Kickoff -->
        <div class="glass rounded-xl p-6">
          <h3 class="font-semibold text-white mb-4">🗓️ Month 1 — Quick Wins</h3>
          <div class="space-y-2">
            \${(s.strategy?.monthlyPlan?.[0]?.tasks || []).map(t => \`
              <div class="flex items-start gap-2 text-sm">
                <div class="w-5 h-5 grad-linkedin rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i class="fas fa-check text-white text-xs"></i>
                </div>
                <span class="text-slate-300">\${t}</span>
              </div>
            \`).join('')}
          </div>
          <div class="mt-3 pt-3 border-t border-slate-700/50">
            <div class="flex items-center gap-2">
              <i class="fas fa-trophy text-yellow-400 text-xs"></i>
              <span class="text-xs text-yellow-400">Milestone: \${s.strategy?.monthlyPlan?.[0]?.milestone}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="glass rounded-2xl p-8 text-center" style="background: linear-gradient(135deg, rgba(0,119,181,0.15), rgba(0,160,220,0.05));">
        <div class="text-3xl mb-3">🤖</div>
        <h2 class="text-xl font-bold text-white mb-2">Your AI Agent is Ready to Execute</h2>
        <p class="text-slate-400 text-sm mb-6">Daily automated tasks, content creation, network outreach, analytics — all with <span class="text-blue-400 font-semibold">your approval before publishing</span></p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <button onclick="enterDashboard()" class="btn-primary px-8 py-3 text-base">
            <i class="fas fa-rocket mr-2"></i> Launch My Dashboard
          </button>
        </div>
      </div>
    </div>
  </div>
  \`;
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
function renderDashboard() {
  return \`
  <div class="flex min-h-screen">
    <!-- Sidebar -->
    \${renderSidebar()}
    <!-- Main -->
    <div class="main-content flex-1 flex flex-col">
      \${renderTopBar()}
      <div class="flex-1 overflow-y-auto p-6">
        \${renderTabContent()}
      </div>
    </div>
  </div>
  \`;
}

function renderSidebar() {
  const navItems = [
    { id: 'overview', icon: 'fas fa-chart-line', label: 'Dashboard' },
    { id: 'content', icon: 'fas fa-edit', label: 'Content Queue' },
    { id: 'approvals', icon: 'fas fa-check-circle', label: 'Approvals', badge: STATE.notifications },
    { id: 'automation', icon: 'fas fa-robot', label: 'Automation' },
    { id: 'network', icon: 'fas fa-users', label: 'Network' },
    { id: 'strategy', icon: 'fas fa-chess', label: 'Strategy' },
    { id: 'analytics', icon: 'fas fa-chart-pie', label: 'Analytics' },
    { id: 'goals', icon: 'fas fa-trophy', label: 'Goals & Milestones' },
  ];

  const user = STATE.user || { name: 'LinkedIn User', headline: 'Professional', linkedinId: 'user' };
  const obj = OBJECTIVES.find(o => o.id === STATE.objective);

  return \`
  <aside class="sidebar flex flex-col">
    <!-- Logo -->
    <div class="p-4 border-b border-white/5">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 grad-linkedin rounded-lg flex items-center justify-center text-lg flex-shrink-0">🚀</div>
        <div class="logo-text">
          <div class="text-sm font-bold text-white">LinkedBoost</div>
          <div class="text-xs text-blue-400 font-semibold">AI Agent</div>
        </div>
      </div>
    </div>

    <!-- User Card -->
    <div class="p-3 border-b border-white/5">
      <div class="glass rounded-lg p-3">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-8 h-8 grad-linkedin rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            \${(user.name || 'U')[0].toUpperCase()}
          </div>
          <div class="logo-text overflow-hidden">
            <div class="text-xs font-semibold text-white truncate">\${user.name}</div>
            <div class="text-xs text-slate-500 truncate">\${user.headline || 'Professional'}</div>
          </div>
        </div>
        \${obj ? \`<div class="badge badge-blue text-xs logo-text">\${obj.icon} \${obj.label}</div>\` : ''}
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 p-3 overflow-y-auto">
      \${navItems.map(item => \`
        <div class="nav-item \${STATE.activeTab === item.id ? 'active' : ''}" onclick="setTab('\${item.id}')">
          <i class="\${item.icon} text-sm"></i>
          <span class="nav-label text-sm">\${item.label}</span>
          \${item.badge ? \`<span class="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 logo-text">\${item.badge}</span>\` : ''}
        </div>
      \`).join('')}
    </nav>

    <!-- Status Footer -->
    <div class="p-3 border-t border-white/5">
      <div class="nav-label">
        <div class="flex items-center gap-2 mb-1">
          <span class="pulse-dot w-2 h-2 bg-green-400 rounded-full inline-block"></span>
          <span class="text-xs text-green-400 font-medium">Agent Active</span>
        </div>
        <div class="text-xs text-slate-500">Next task in 23 mins</div>
      </div>
    </div>
  </aside>
  \`;
}

function renderTopBar() {
  const tabs = {
    overview: '📊 Dashboard Overview',
    content: '✍️ Content Queue',
    approvals: '✅ Human Approvals',
    automation: '🤖 Automation Center',
    network: '🌐 Network Builder',
    strategy: '🗺️ 12-Month Strategy',
    analytics: '📈 Deep Analytics',
    goals: '🏆 Goals & Milestones'
  };

  return \`
  <header class="glass-dark border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
    <div>
      <h1 class="text-lg font-bold text-white">\${tabs[STATE.activeTab] || 'Dashboard'}</h1>
      <div class="text-xs text-slate-500">LinkedIn Personal Branding Agent • \${new Date().toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric'})}</div>
    </div>
    <div class="flex items-center gap-3">
      <div class="relative">
        <button class="btn-ghost relative" onclick="setTab('approvals')">
          <i class="fas fa-bell text-sm"></i>
          \${STATE.notifications > 0 ? \`<span class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">\${STATE.notifications}</span>\` : ''}
        </button>
      </div>
      <button onclick="generateDailyContent()" class="btn-primary text-sm">
        <i class="fas fa-magic mr-1"></i> Generate Content
      </button>
    </div>
  </header>
  \`;
}

function renderTabContent() {
  if (STATE.activeTab === 'overview') return renderOverviewTab();
  if (STATE.activeTab === 'content') return renderContentTab();
  if (STATE.activeTab === 'approvals') return renderApprovalsTab();
  if (STATE.activeTab === 'automation') return renderAutomationTab();
  if (STATE.activeTab === 'network') return renderNetworkTab();
  if (STATE.activeTab === 'strategy') return renderStrategyTab();
  if (STATE.activeTab === 'analytics') return renderAnalyticsTab();
  if (STATE.activeTab === 'goals') return renderGoalsTab();
  return '';
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────
function renderOverviewTab() {
  return \`
  <div class="fade-in space-y-6">
    <!-- AI Agent Status Banner -->
    <div class="glass rounded-xl p-4 flex items-center gap-4" style="border-color:rgba(16,185,129,0.3); background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(30,41,59,0.5));">
      <div class="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center text-xl">🤖</div>
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-0.5">
          <span class="text-sm font-semibold text-white">AI Agent Running</span>
          <span class="pulse-dot w-2 h-2 bg-green-400 rounded-full inline-block"></span>
        </div>
        <div class="text-xs text-slate-400">Completed 7 tasks today • Next: <span class="text-blue-400">Comment on 5 industry posts (in 23 min)</span> • Awaiting 3 approvals</div>
      </div>
      <button onclick="setTab('approvals')" class="btn-success text-xs">Review Approvals <span class="bg-white/20 rounded-full px-1.5 py-0.5 ml-1">3</span></button>
    </div>

    <!-- Metrics Grid -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      \${[
        { icon: '👥', label: 'Followers', value: '2,847', change: '+234', up: true, color: '#0077B5' },
        { icon: '👁️', label: 'Profile Views', value: '1,203', change: '+456', up: true, color: '#7C3AED' },
        { icon: '📣', label: 'Impressions', value: '28.4K', change: '+8.2K', up: true, color: '#059669' },
        { icon: '💬', label: 'Engagement', value: '4.8%', change: '+1.2%', up: true, color: '#D97706' },
        { icon: '🤝', label: 'Connections', value: '892', change: '+87', up: true, color: '#DC2626' },
        { icon: '🔍', label: 'Searches', value: '345', change: '+120', up: true, color: '#0EA5E9' },
      ].map(m => \`
        <div class="metric-card text-center">
          <div class="text-2xl mb-1">\${m.icon}</div>
          <div class="text-xs text-slate-500 mb-1">\${m.label}</div>
          <div class="text-lg font-bold text-white">\${m.value}</div>
          <div class="text-xs \${m.up ? 'text-green-400' : 'text-red-400'} font-medium">
            <i class="fas fa-arrow-\${m.up ? 'up' : 'down'} mr-0.5"></i>\${m.change}
          </div>
        </div>
      \`).join('')}
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Impressions Chart -->
      <div class="glass rounded-xl p-5 md:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-semibold text-white text-sm">Post Impressions — Last 7 Days</h3>
            <div class="text-xs text-slate-500">Total: 28,400 impressions</div>
          </div>
          <div class="badge badge-green"><i class="fas fa-trending-up mr-1"></i>+40.6%</div>
        </div>
        <canvas id="impressions-chart" height="120"></canvas>
      </div>

      <!-- Goal Progress Donut -->
      <div class="glass rounded-xl p-5">
        <h3 class="font-semibold text-white text-sm mb-1">12-Month Goal Progress</h3>
        <div class="text-xs text-slate-500 mb-4">Month 4 of 12</div>
        <div class="relative w-36 h-36 mx-auto mb-4">
          <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="14" stroke="rgba(255,255,255,0.06)" stroke-width="4" fill="none"/>
            <circle cx="18" cy="18" r="14" stroke="#0077B5" stroke-width="4" fill="none"
              stroke-dasharray="88" stroke-dashoffset="\${88 - (88*0.34)}" stroke-linecap="round"/>
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <div class="text-2xl font-black text-white">34%</div>
            <div class="text-xs text-slate-400">Complete</div>
          </div>
        </div>
        <div class="space-y-2">
          \${[
            { label: 'Followers', p: 57 },
            { label: 'Engagement', p: 48 },
            { label: 'Content', p: 67 },
            { label: 'Network', p: 41 }
          ].map(g => \`
            <div>
              <div class="flex justify-between text-xs mb-0.5">
                <span class="text-slate-400">\${g.label}</span>
                <span class="text-white font-medium">\${g.p}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width:\${g.p}%"></div>
              </div>
            </div>
          \`).join('')}
        </div>
      </div>
    </div>

    <!-- Today's Tasks + Top Posts -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Today's Tasks -->
      <div class="glass rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-white text-sm">Today's Execution Plan</h3>
          <div class="badge badge-blue">7 tasks</div>
        </div>
        <div class="space-y-2">
          \${[
            { time: '7:30 AM', task: 'Post: "AI in Leadership"', icon: '📤', status: 'done', auto: true },
            { time: '9:00 AM', task: 'Send 10 connection requests', icon: '🤝', status: 'done', auto: true },
            { time: '11:00 AM', task: 'Comment on 5 trending posts', icon: '💬', status: 'running', auto: true },
            { time: '1:00 PM', task: 'Review content for tomorrow', icon: '👁️', status: 'pending', auto: false },
            { time: '3:00 PM', task: 'Reply to DMs and comments', icon: '✉️', status: 'pending', auto: false },
            { time: '5:00 PM', task: 'Repost from industry leaders', icon: '🔄', status: 'pending', auto: true },
            { time: '7:00 PM', task: 'Daily analytics review', icon: '📊', status: 'pending', auto: true },
          ].map(t => \`
            <div class="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0">
              <div class="text-base">\${t.icon}</div>
              <div class="flex-1 min-w-0">
                <div class="text-xs text-white truncate">\${t.task}</div>
                <div class="text-xs text-slate-500">\${t.time} \${t.auto ? '• <span class="text-blue-400">Auto</span>' : '• <span class="text-yellow-400">Needs approval</span>'}</div>
              </div>
              <div class="flex-shrink-0">
                \${t.status === 'done' ? '<i class="fas fa-check-circle text-green-400 text-sm"></i>' :
                  t.status === 'running' ? '<i class="fas fa-spinner fa-spin text-blue-400 text-sm"></i>' :
                  '<i class="far fa-circle text-slate-600 text-sm"></i>'}
              </div>
            </div>
          \`).join('')}
        </div>
      </div>

      <!-- Recent Top Posts -->
      <div class="glass rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-white text-sm">Top Performing Posts</h3>
          <button onclick="setTab('analytics')" class="text-xs text-blue-400 hover:text-blue-300">See all</button>
        </div>
        <div class="space-y-3">
          \${[
            { title: '3 things about leadership...', impressions: '12.4K', likes: 342, comments: 87, days: 3 },
            { title: 'Future of AI in Enterprise', impressions: '8.9K', likes: 234, comments: 156, days: 7 },
            { title: 'I was wrong about remote work', impressions: '7.2K', likes: 456, comments: 203, days: 14 }
          ].map((p, i) => \`
            <div class="content-card">
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0 \${i===0?'grad-linkedin':i===1?'grad-purple':'grad-green'}">\${i+1}</div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-white font-medium truncate">\${p.title}</div>
                  <div class="flex gap-3 mt-1">
                    <span class="text-xs text-slate-500"><i class="fas fa-eye mr-1 text-blue-400"></i>\${p.impressions}</span>
                    <span class="text-xs text-slate-500"><i class="fas fa-heart mr-1 text-red-400"></i>\${p.likes}</span>
                    <span class="text-xs text-slate-500"><i class="fas fa-comment mr-1 text-green-400"></i>\${p.comments}</span>
                  </div>
                </div>
                <span class="text-xs text-slate-600">\${p.days}d ago</span>
              </div>
            </div>
          \`).join('')}
        </div>
      </div>
    </div>
  </div>
  \`;
}

// ─── APPROVALS TAB ────────────────────────────────────────────────────────────
function renderApprovalsTab() {
  const approvals = [
    {
      id: 'ap1', priority: 'high', type: 'LinkedIn Post', icon: '📝', urgency: 'Post today at 8:00 AM',
      title: 'Thought Leadership Post — AI Strategy',
      preview: '3 things about building a team in the age of AI: Your best engineers want to solve novel problems, not maintain old systems...',
      score: 91, tags: ['#AI', '#Leadership', '#FutureOfWork'],
      stats: { reach: '3,200 - 5,800', engagement: 'High', bestTime: 'Today 8:00 AM' }
    },
    {
      id: 'ap2', priority: 'high', type: 'Connection Request Batch', icon: '🤝', urgency: '15 personalized requests ready',
      title: '15 Personalized Connection Requests — CTOs & VPs',
      preview: 'Targeted: Sarah Chen (CTO), Marcus Johnson (VP Eng), Priya Sharma (CEO) + 12 more. Personalized notes for each based on their recent posts.',
      score: 88, tags: ['CTOs', 'VPs Engineering', 'Founders'],
      stats: { reach: '15 requests', engagement: 'Personalized', bestTime: 'Today 11:00 AM' }
    },
    {
      id: 'ap3', priority: 'medium', type: 'LinkedIn Article', icon: '📖', urgency: 'Schedule for Wednesday',
      title: 'Article: "Why 90% of LinkedIn Strategies Fail"',
      preview: "The dirty secret about LinkedIn engagement: most professionals post and pray. Here is the framework that changed everything for me...",
      score: 94, tags: ['#LinkedInStrategy', '#PersonalBrand', '#ProfessionalGrowth'],
      stats: { reach: '8,000 - 15,000', engagement: 'Very High', bestTime: 'Wed 10:00 AM' }
    }
  ];

  return \`
  <div class="fade-in space-y-4">
    <!-- Header -->
    <div class="glass rounded-xl p-4 flex items-center gap-4" style="border-color: rgba(245,158,11,0.3);">
      <div class="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center text-xl">🔔</div>
      <div class="flex-1">
        <div class="text-sm font-semibold text-white">Human-in-Loop Approval Center</div>
        <div class="text-xs text-slate-400">Review, edit, and approve AI-generated content before it goes live. You have full control.</div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold text-yellow-400">3</div>
        <div class="text-xs text-slate-500">Pending</div>
      </div>
    </div>

    <!-- Approval Stats -->
    <div class="grid grid-cols-4 gap-3">
      \${[
        { label: 'Pending', value: 3, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
        { label: 'Approved Today', value: 6, color: 'text-green-400', bg: 'bg-green-500/10' },
        { label: 'Scheduled', value: 8, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Published', value: 23, color: 'text-purple-400', bg: 'bg-purple-500/10' }
      ].map(s => \`
        <div class="metric-card text-center \${s.bg}">
          <div class="text-xl font-bold \${s.color}">\${s.value}</div>
          <div class="text-xs text-slate-500 mt-0.5">\${s.label}</div>
        </div>
      \`).join('')}
    </div>

    <!-- Pending Approvals -->
    <div>
      <h3 class="text-sm font-semibold text-white mb-3">⏳ Pending Your Approval</h3>
      \${approvals.map(a => \`
        <div class="approval-item \${a.priority}" id="approval-\${a.id}">
          <div class="flex items-start gap-3 mb-3">
            <div class="text-2xl">\${a.icon}</div>
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-sm font-semibold text-white">\${a.title}</span>
                <span class="badge \${a.priority === 'high' ? 'badge-yellow' : 'badge-blue'}">\${a.type}</span>
                <span class="badge badge-green"><i class="fas fa-star mr-1"></i>\${a.score}/100</span>
              </div>
              <div class="text-xs text-\${a.priority === 'high' ? 'yellow' : 'blue'}-400 mb-2">⏰ \${a.urgency}</div>
              <div class="bg-slate-900/50 rounded-lg p-3 text-xs text-slate-300 whitespace-pre-line mb-2 font-mono">\${a.preview}</div>
              <div class="flex flex-wrap gap-1 mb-2">
                \${a.tags.map(t => \`<span class="badge badge-purple text-xs">\${t}</span>\`).join('')}
              </div>
              <div class="grid grid-cols-3 gap-2 text-xs">
                <div class="glass-dark rounded px-2 py-1"><span class="text-slate-500">Est. Reach:</span> <span class="text-white font-medium">\${a.stats.reach}</span></div>
                <div class="glass-dark rounded px-2 py-1"><span class="text-slate-500">Engagement:</span> <span class="text-green-400 font-medium">\${a.stats.engagement}</span></div>
                <div class="glass-dark rounded px-2 py-1"><span class="text-slate-500">Best Time:</span> <span class="text-blue-400 font-medium">\${a.stats.bestTime}</span></div>
              </div>
            </div>
          </div>
          <div class="flex gap-2 justify-end">
            <button onclick="handleApproval('\${a.id}', 'edit')" class="btn-ghost text-xs"><i class="fas fa-edit mr-1"></i>Edit</button>
            <button onclick="handleApproval('\${a.id}', 'reject')" class="btn-danger text-xs"><i class="fas fa-times mr-1"></i>Reject</button>
            <button onclick="handleApproval('\${a.id}', 'approve')" class="btn-success text-xs"><i class="fas fa-check mr-1"></i>Approve & Schedule</button>
          </div>
        </div>
      \`).join('')}
    </div>
  </div>
  \`;
}

// ─── CONTENT TAB ──────────────────────────────────────────────────────────────
function renderContentTab() {
  const contentItems = [
    { id: 1, type: 'Post', topic: 'Industry Insight', scheduledFor: 'Today 8:00 AM', status: 'approved', preview: '3 reasons why AI will not replace critical thinking...', score: 88, platform: 'LinkedIn' },
    { id: 2, type: '📖 Article', topic: 'Leadership Lessons', scheduledFor: 'Tomorrow 10:00 AM', status: 'pending', preview: 'The untold story of scaling from 0 to 100 employees...', score: 91, platform: 'LinkedIn' },
    { id: 3, type: '💬 Comments', topic: 'Engagement Drive', scheduledFor: 'Today 2:00 PM', status: 'approved', preview: 'Thoughtful comments on 5 trending posts in your niche', score: 75, platform: 'LinkedIn' },
    { id: 4, type: '🤝 Connect', topic: 'Network Expansion', scheduledFor: 'Today 11:00 AM', status: 'pending', preview: '15 personalized requests to CTOs and engineering leaders', score: 82, platform: 'LinkedIn' },
    { id: 5, type: '🔄 Repost', topic: 'Curated Content', scheduledFor: 'Wed 9:00 AM', status: 'pending', preview: 'Amplify: "Future of fintech" by Sarah Chen with your insights', score: 79, platform: 'LinkedIn' },
    { id: 6, type: '✉️ DM', topic: 'Warm Outreach', scheduledFor: 'Thu 10:00 AM', status: 'pending', preview: '10 personalized DMs to hiring managers at target companies', score: 85, platform: 'LinkedIn' },
  ];

  return \`
  <div class="fade-in space-y-4">
    <!-- Content Pipeline Stats -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
      \${[
        { label: 'Drafts', count: 8, icon: '✏️', color: 'text-slate-400' },
        { label: 'Pending Approval', count: 4, icon: '⏳', color: 'text-yellow-400' },
        { label: 'Approved', count: 6, icon: '✅', color: 'text-green-400' },
        { label: 'Scheduled', count: 8, icon: '📅', color: 'text-blue-400' },
        { label: 'Published', count: 23, icon: '📤', color: 'text-purple-400' }
      ].map(s => \`
        <div class="metric-card text-center">
          <div class="text-2xl mb-1">\${s.icon}</div>
          <div class="text-lg font-bold \${s.color}">\${s.count}</div>
          <div class="text-xs text-slate-500">\${s.label}</div>
        </div>
      \`).join('')}
    </div>

    <!-- Content Calendar View -->
    <div class="glass rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-white text-sm">📅 Weekly Content Calendar</h3>
        <button onclick="generateDailyContent()" class="btn-primary text-xs"><i class="fas fa-magic mr-1"></i>Generate Week</button>
      </div>
      <div class="grid grid-cols-7 gap-2">
        \${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => \`
          <div class="text-center">
            <div class="text-xs text-slate-500 mb-2 font-medium">\${day}</div>
            <div class="space-y-1">
              \${i < 5 ? \`
                <div class="bg-blue-500/20 border border-blue-500/30 rounded p-1 text-xs text-blue-300 cursor-pointer hover:bg-blue-500/30">📝 Post</div>
                \${i % 2 === 0 ? '<div class="bg-green-500/20 border border-green-500/30 rounded p-1 text-xs text-green-300 cursor-pointer hover:bg-green-500/30">🤝 Connect</div>' : ''}
                \${i === 2 ? '<div class="bg-purple-500/20 border border-purple-500/30 rounded p-1 text-xs text-purple-300 cursor-pointer hover:bg-purple-500/30">📖 Article</div>' : ''}
              \` : '<div class="bg-slate-700/30 rounded p-1 text-xs text-slate-600">Light</div>'}
            </div>
          </div>
        \`).join('')}
      </div>
    </div>

    <!-- Content Queue List -->
    <div class="glass rounded-xl p-5">
      <h3 class="font-semibold text-white text-sm mb-4">📋 Content Queue</h3>
      <div class="space-y-3">
        \${contentItems.map(item => \`
          <div class="content-card flex items-center gap-3">
            <div class="text-2xl">\${item.type.split(' ')[0]}</div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <span class="text-sm font-medium text-white">\${item.type}</span>
                <span class="badge \${item.status === 'approved' ? 'badge-green' : 'badge-yellow'}">\${item.status === 'approved' ? '✅ Approved' : '⏳ Pending'}</span>
                <span class="badge badge-blue">AI Score: \${item.score}</span>
              </div>
              <div class="text-xs text-slate-400 truncate">\${item.preview}</div>
              <div class="text-xs text-slate-600 mt-0.5">📅 \${item.scheduledFor} • \${item.platform}</div>
            </div>
            <div class="flex gap-2 flex-shrink-0">
              <button class="btn-ghost text-xs" onclick="showToast('Editing content...', 'info')"><i class="fas fa-edit"></i></button>
              \${item.status === 'pending' ? \`<button class="btn-success text-xs" onclick="showToast('Content approved!', 'success')">Approve</button>\` : '<button class="btn-ghost text-xs" disabled>Scheduled</button>'}
            </div>
          </div>
        \`).join('')}
      </div>
    </div>
  </div>
  \`;
}

// ─── AUTOMATION TAB ───────────────────────────────────────────────────────────
function renderAutomationTab() {
  return \`
  <div class="fade-in space-y-4">
    <!-- Automation Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      \${[
        { label: 'Tasks This Week', value: '47', icon: '⚡', color: 'grad-linkedin', change: '+12%' },
        { label: 'Success Rate', value: '94.2%', icon: '🎯', color: 'grad-green', change: '+2.1%' },
        { label: 'Time Saved', value: '8.5 hrs', icon: '⏰', color: 'grad-purple', change: 'weekly' },
        { label: 'Content Generated', value: '31', icon: '✍️', color: 'grad-orange', change: 'this month' }
      ].map(s => \`
        <div class="metric-card">
          <div class="flex items-center justify-between mb-2">
            <span class="text-2xl">\${s.icon}</span>
            <span class="text-xs text-green-400">\${s.change}</span>
          </div>
          <div class="text-xl font-bold text-white">\${s.value}</div>
          <div class="text-xs text-slate-500">\${s.label}</div>
        </div>
      \`).join('')}
    </div>

    <!-- Automation Modules Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      \${[
        {
          icon: '✍️', title: 'Content Generation', status: 'active',
          desc: 'AI generates posts, articles, and engagement content daily based on your goals',
          features: ['Posts (5x/week)', 'Long-form articles (1x/week)', 'Comment responses', 'Repost curation'],
          nextRun: 'Tomorrow 6:00 AM', color: 'rgba(0,119,181,0.1)'
        },
        {
          icon: '🤝', title: 'Smart Connection Requests', status: 'active',
          desc: 'AI finds and connects with high-value profiles matching your target audience',
          features: ['ICP-based targeting', 'Personalized notes', '15 requests/day', 'Follow-up sequences'],
          nextRun: 'Today 11:00 AM', color: 'rgba(5,150,105,0.1)'
        },
        {
          icon: '💬', title: 'Intelligent Engagement', status: 'active',
          desc: 'Comment on trending posts to boost your visibility before publishing your own',
          features: ['10 meaningful comments/day', 'Trending post detection', 'Influencer engagement', 'Reply monitoring'],
          nextRun: 'Today 11:00 AM (running)', color: 'rgba(124,58,237,0.1)'
        },
        {
          icon: '📊', title: 'Analytics & Reporting', status: 'active',
          desc: 'Daily performance tracking with AI insights and optimization recommendations',
          features: ['Daily metrics digest', 'Content performance scoring', 'Audience growth tracking', 'Weekly report'],
          nextRun: 'Today 7:00 PM', color: 'rgba(217,119,6,0.1)'
        },
        {
          icon: '📮', title: 'Outreach Campaigns', status: 'paused',
          desc: 'Personalized DM sequences to warm leads, recruiters, or prospects',
          features: ['Personalized first message', '3-touch sequence', 'Response handling', 'CRM tagging'],
          nextRun: 'Paused — Click to resume', color: 'rgba(100,116,139,0.1)'
        },
        {
          icon: '🔄', title: 'Content Amplification', status: 'active',
          desc: 'Automatically reposts and shares relevant content from industry leaders',
          features: ['Curated repost selection', 'Added commentary', 'Hashtag optimization', 'Tagging influencers'],
          nextRun: 'Wed 9:00 AM', color: 'rgba(220,38,38,0.1)'
        }
      ].map(m => \`
        <div class="glass rounded-xl p-5" style="background: \${m.color}; border-color: rgba(255,255,255,0.06);">
          <div class="flex items-start gap-3 mb-3">
            <div class="text-2xl">\${m.icon}</div>
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-sm font-semibold text-white">\${m.title}</span>
                <span class="badge \${m.status === 'active' ? 'badge-green' : 'badge-yellow'}">
                  \${m.status === 'active' ? '● Active' : '⏸ Paused'}
                </span>
              </div>
              <div class="text-xs text-slate-400">\${m.desc}</div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-1 mb-3">
            \${m.features.map(f => \`<div class="text-xs text-slate-400 flex items-center gap-1"><i class="fas fa-check text-green-400" style="font-size:9px"></i> \${f}</div>\`).join('')}
          </div>
          <div class="flex items-center justify-between">
            <div class="text-xs text-slate-500">⏭️ \${m.nextRun}</div>
            <button onclick="showToast('\${m.status === 'active' ? 'Pausing' : 'Starting'} \${m.title}...', 'info')" class="\${m.status === 'active' ? 'btn-ghost' : 'btn-success'} text-xs">
              \${m.status === 'active' ? '<i class="fas fa-pause mr-1"></i>Pause' : '<i class="fas fa-play mr-1"></i>Resume'}
            </button>
          </div>
        </div>
      \`).join('')}
    </div>
  </div>
  \`;
}

// ─── NETWORK TAB ──────────────────────────────────────────────────────────────
function renderNetworkTab() {
  const suggestions = [
    { name: 'Sarah Chen', title: 'CTO at TechVentures', mutual: 12, reason: 'AI Leadership interest', score: 94, followers: '12K', company: 'TechVentures' },
    { name: 'Marcus Johnson', title: 'VP Engineering, Scale AI', mutual: 8, reason: 'Active in your industry', score: 91, followers: '8.2K', company: 'Scale AI' },
    { name: 'Priya Sharma', title: 'CEO & Founder, FutureWork', mutual: 15, reason: 'Engages with similar content', score: 89, followers: '22K', company: 'FutureWork' },
    { name: 'David Williams', title: 'Partner, Sequoia Capital', mutual: 3, reason: 'Key investor in your space', score: 88, followers: '45K', company: 'Sequoia' },
    { name: 'Lisa Rodriguez', title: 'Head of Talent, Google', mutual: 6, reason: 'Key recruiter network', score: 85, followers: '18K', company: 'Google' },
  ];

  return \`
  <div class="fade-in space-y-4">
    <!-- Network Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      \${[
        { label: 'Total Connections', value: '892', icon: '🤝', color: 'text-blue-400' },
        { label: 'Requests Sent (Week)', value: '47', icon: '📤', color: 'text-green-400' },
        { label: 'Acceptance Rate', value: '68%', icon: '✅', color: 'text-yellow-400' },
        { label: 'Messages Sent', value: '23', icon: '✉️', color: 'text-purple-400' }
      ].map(s => \`
        <div class="metric-card text-center">
          <div class="text-2xl mb-1">\${s.icon}</div>
          <div class="text-xl font-bold \${s.color}">\${s.value}</div>
          <div class="text-xs text-slate-500">\${s.label}</div>
        </div>
      \`).join('')}
    </div>

    <!-- Suggested Connections -->
    <div class="glass rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-white text-sm">🎯 AI-Recommended Connections</h3>
        <button onclick="showToast('Sending all approved requests...', 'success')" class="btn-primary text-xs"><i class="fas fa-paper-plane mr-1"></i>Send All (Approved)</button>
      </div>
      <div class="space-y-3">
        \${suggestions.map(s => \`
          <div class="content-card flex items-center gap-3">
            <div class="w-10 h-10 grad-linkedin rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
              \${s.name[0]}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-white">\${s.name}</span>
                <span class="badge badge-blue text-xs">Match: \${s.score}%</span>
              </div>
              <div class="text-xs text-slate-400">\${s.title}</div>
              <div class="flex gap-3 mt-1 text-xs text-slate-500">
                <span><i class="fas fa-users mr-1"></i>\${s.mutual} mutual</span>
                <span><i class="fas fa-eye mr-1"></i>\${s.followers} followers</span>
                <span class="text-blue-400">\${s.reason}</span>
              </div>
            </div>
            <div class="flex gap-2 flex-shrink-0">
              <button onclick="showToast('Viewing profile...','info')" class="btn-ghost text-xs"><i class="fas fa-external-link-alt"></i></button>
              <button onclick="showToast('Connection request sent to \${s.name}!', 'success')" class="btn-primary text-xs">Connect</button>
            </div>
          </div>
        \`).join('')}
      </div>
    </div>

    <!-- Outreach Templates -->
    <div class="glass rounded-xl p-5">
      <h3 class="font-semibold text-white text-sm mb-4">✉️ AI Outreach Templates</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        \${[
          { icon: '👔', title: 'Recruiter Outreach', preview: 'Hi [Name], I noticed you have been hiring for [role] at [company]. Would love to connect and explore...', type: 'Job Search' },
          { icon: '🤝', title: 'Peer Connection', preview: 'Hi [Name], your post on [topic] really resonated with me. Working on [similar area] and would love...', type: 'Network' },
          { icon: '💼', title: 'Business Development', preview: 'Hi [Name], I help [ICP] achieve [outcome] in [timeframe]. Given your role at [company]...', type: 'Sales' }
        ].map(t => \`
          <div class="content-card cursor-pointer" onclick="showToast('Template loaded for customization', 'info')">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xl">\${t.icon}</span>
              <div>
                <div class="text-xs font-semibold text-white">\${t.title}</div>
                <div class="badge badge-blue mt-0.5">\${t.type}</div>
              </div>
            </div>
            <div class="text-xs text-slate-400 italic">\${t.preview.substring(0,80)}...</div>
          </div>
        \`).join('')}
      </div>
    </div>
  </div>
  \`;
}

// ─── STRATEGY TAB ─────────────────────────────────────────────────────────────
function renderStrategyTab() {
  const s = STATE.strategy;
  const obj = OBJECTIVES.find(o => o.id === STATE.objective);
  if (!s) return '<div class="text-slate-400 p-8 text-center">No strategy loaded. Complete onboarding first.</div>';

  return \`
  <div class="fade-in space-y-4">
    <!-- Strategy Summary -->
    <div class="glass rounded-xl p-6" style="background: linear-gradient(135deg, rgba(0,119,181,0.12), rgba(30,41,59,0.6));">
      <div class="flex items-center gap-4 mb-4">
        <span class="text-4xl">\${obj?.icon || '🎯'}</span>
        <div>
          <h2 class="text-lg font-bold text-white">\${s.strategy?.title}</h2>
          <div class="text-sm text-slate-400">\${s.strategy?.description}</div>
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        \${(s.strategy?.kpis || []).map(kpi => \`
          <div class="glass-dark rounded-lg p-3 text-center">
            <div class="text-xs text-slate-500 mb-1">\${kpi.metric}</div>
            <div class="text-sm font-bold text-blue-400">\${kpi.target}</div>
          </div>
        \`).join('')}
      </div>
    </div>

    <!-- 12-Month Roadmap -->
    <div class="glass rounded-xl p-6">
      <h3 class="font-semibold text-white mb-4">🗺️ 12-Month Execution Roadmap</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        \${(s.strategy?.monthlyPlan || []).map((plan, i) => \`
          <div class="timeline-item">
            <div class="relative flex flex-col items-center" style="width:38px; flex-shrink:0">
              <div class="timeline-dot \${i < 3 ? 'bg-green-500' : i === 3 ? 'grad-linkedin' : 'bg-slate-700'} text-white font-bold text-xs">
                \${i < 3 ? '<i class="fas fa-check text-xs"></i>' : plan.month}
              </div>
              \${i < (s.strategy.monthlyPlan.length - 1) ? '<div class="w-0.5 bg-slate-700/50 flex-1 mt-1" style="min-height:20px;"></div>' : ''}
            </div>
            <div class="pb-4 flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-bold text-slate-400">Month \${plan.month}</span>
                <span class="text-sm font-semibold text-white">\${plan.title}</span>
                \${i < 3 ? '<span class="badge badge-green text-xs">Done</span>' : i === 3 ? '<span class="badge badge-blue text-xs">In Progress</span>' : ''}
              </div>
              <ul class="space-y-1">
                \${plan.tasks.map(t => \`<li class="text-xs text-slate-400 flex items-center gap-1.5"><i class="fas fa-circle text-slate-600" style="font-size:4px"></i>\${t}</li>\`).join('')}
              </ul>
              <div class="mt-2 flex items-center gap-1">
                <i class="fas fa-flag text-yellow-400" style="font-size:10px"></i>
                <span class="text-xs text-yellow-400">\${plan.milestone}</span>
              </div>
            </div>
          </div>
        \`).join('')}
      </div>
    </div>

    <!-- Weekly Action Plan -->
    <div class="glass rounded-xl p-5">
      <h3 class="font-semibold text-white mb-4">📅 Weekly Action Template</h3>
      <div class="grid grid-cols-7 gap-2">
        \${(s.strategy?.weeklyActions || []).map(day => \`
          <div class="glass-dark rounded-lg p-3">
            <div class="text-xs font-bold text-blue-400 mb-2 text-center">\${day.day}</div>
            <div class="space-y-1">
              \${day.actions.map(a => \`<div class="text-xs text-slate-400 leading-snug">\${a}</div>\`).join('<div class="w-full h-px bg-slate-700/50 my-1"></div>')}
            </div>
          </div>
        \`).join('')}
      </div>
    </div>
  </div>
  \`;
}

// ─── ANALYTICS TAB ───────────────────────────────────────────────────────────
function renderAnalyticsTab() {
  return \`
  <div class="fade-in space-y-4">
    <!-- KPI Overview -->
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
      \${[
        { label: 'Followers', current: '2,847', prev: '2,613', change: '+9%', icon: '👥', color: '#0077B5' },
        { label: 'Post Impressions', current: '28.4K', prev: '20.2K', change: '+40%', icon: '📣', color: '#7C3AED' },
        { label: 'Engagement Rate', current: '4.8%', prev: '3.6%', change: '+33%', icon: '💬', color: '#059669' },
        { label: 'Profile Views', current: '1,203', prev: '747', change: '+61%', icon: '👁️', color: '#D97706' },
        { label: 'Connections', current: '892', prev: '805', change: '+11%', icon: '🤝', color: '#DC2626' },
        { label: 'Search Appearances', current: '345', prev: '225', change: '+53%', icon: '🔍', color: '#0EA5E9' }
      ].map(m => \`
        <div class="metric-card">
          <div class="flex items-start justify-between mb-2">
            <div class="text-xl">\${m.icon}</div>
            <span class="badge badge-green text-xs"><i class="fas fa-arrow-up mr-1"></i>\${m.change}</span>
          </div>
          <div class="text-2xl font-black text-white mb-0.5">\${m.current}</div>
          <div class="text-xs text-slate-500">\${m.label}</div>
          <div class="text-xs text-slate-600 mt-0.5">was \${m.prev}</div>
        </div>
      \`).join('')}
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="glass rounded-xl p-5">
        <h3 class="font-semibold text-white text-sm mb-4">📈 Follower Growth (12 Weeks)</h3>
        <canvas id="follower-chart" height="160"></canvas>
      </div>
      <div class="glass rounded-xl p-5">
        <h3 class="font-semibold text-white text-sm mb-4">💬 Engagement by Content Type</h3>
        <canvas id="engagement-chart" height="160"></canvas>
      </div>
    </div>

    <!-- Audience Breakdown + Top Posts -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="glass rounded-xl p-5">
        <h3 class="font-semibold text-white text-sm mb-4">👥 Audience Insights</h3>
        <div class="space-y-4">
          <div>
            <div class="text-xs text-slate-500 mb-2">Top Industries</div>
            \${[['Technology', 34], ['Finance', 18], ['Healthcare', 12], ['Consulting', 10], ['Manufacturing', 8]].map(([name, pct]) => \`
              <div class="flex items-center gap-2 mb-1.5">
                <div class="text-xs text-slate-400 w-24 flex-shrink-0">\${name}</div>
                <div class="flex-1 progress-bar">
                  <div class="progress-fill" style="width:\${pct}%"></div>
                </div>
                <div class="text-xs text-white w-8 text-right">\${pct}%</div>
              </div>
            \`).join('')}
          </div>
          <div>
            <div class="text-xs text-slate-500 mb-2">Top Seniority</div>
            \${[['Senior', 28], ['Manager', 24], ['Director', 18], ['C-Suite', 12], ['IC', 18]].map(([name, pct]) => \`
              <div class="flex items-center gap-2 mb-1.5">
                <div class="text-xs text-slate-400 w-24 flex-shrink-0">\${name}</div>
                <div class="flex-1 progress-bar">
                  <div class="progress-fill" style="width:\${pct}%; background: linear-gradient(90deg, #7C3AED, #4F46E5);"></div>
                </div>
                <div class="text-xs text-white w-8 text-right">\${pct}%</div>
              </div>
            \`).join('')}
          </div>
        </div>
      </div>

      <div class="glass rounded-xl p-5">
        <h3 class="font-semibold text-white text-sm mb-4">🏆 Top Performing Content</h3>
        <div class="space-y-3">
          \${[
            { title: '3 things about leadership...', impressions: '12.4K', rate: '3.8%', type: 'Post' },
            { title: 'Future of AI in Enterprise', impressions: '8.9K', rate: '5.4%', type: 'Article' },
            { title: 'I was wrong about remote work', impressions: '7.2K', rate: '10.2%', type: 'Story' },
            { title: 'My 5-year career reflection', impressions: '6.1K', rate: '7.8%', type: 'Post' }
          ].map((p, i) => \`
            <div class="flex items-center gap-3">
              <div class="w-7 h-7 rounded-lg \${['grad-linkedin','grad-purple','grad-green','grad-orange'][i]} flex items-center justify-center text-xs font-bold text-white flex-shrink-0">\${i+1}</div>
              <div class="flex-1 min-w-0">
                <div class="text-xs text-white font-medium truncate">\${p.title}</div>
                <div class="flex gap-3 text-xs text-slate-500 mt-0.5">
                  <span>\${p.impressions} impressions</span>
                  <span class="text-green-400">\${p.rate} engagement</span>
                  <span class="badge badge-blue text-xs">\${p.type}</span>
                </div>
              </div>
            </div>
          \`).join('')}
        </div>
      </div>
    </div>
  </div>
  \`;
}

// ─── GOALS TAB ────────────────────────────────────────────────────────────────
function renderGoalsTab() {
  const obj = OBJECTIVES.find(o => o.id === STATE.objective);

  return \`
  <div class="fade-in space-y-4">
    <!-- Overall Progress Hero -->
    <div class="glass rounded-2xl p-8 text-center" style="background: linear-gradient(135deg, rgba(0,119,181,0.15), rgba(124,58,237,0.1), rgba(30,41,59,0.5));">
      <div class="text-4xl mb-3">\${obj?.icon || '🎯'}</div>
      <h2 class="text-2xl font-bold text-white mb-1">\${obj?.label || 'Your Goal'}</h2>
      <div class="text-slate-400 text-sm mb-6">\${obj?.desc || 'Personal branding objective'}</div>
      <div class="flex items-center justify-center gap-8 mb-6">
        <div class="text-center">
          <div class="text-4xl font-black text-white">34%</div>
          <div class="text-sm text-slate-400">Overall Progress</div>
        </div>
        <div class="w-px h-12 bg-slate-700"></div>
        <div class="text-center">
          <div class="text-4xl font-black text-blue-400">4</div>
          <div class="text-sm text-slate-400">Months Elapsed</div>
        </div>
        <div class="w-px h-12 bg-slate-700"></div>
        <div class="text-center">
          <div class="text-4xl font-black text-green-400">8</div>
          <div class="text-sm text-slate-400">Months to Goal</div>
        </div>
      </div>
      <div class="max-w-md mx-auto">
        <div class="progress-bar h-3 mb-2">
          <div class="progress-fill h-3" style="width: 34%"></div>
        </div>
        <div class="flex justify-between text-xs text-slate-500">
          <span>Started Jan 2025</span>
          <span class="text-blue-400">On track for Dec 2025</span>
        </div>
      </div>
    </div>

    <!-- Milestones Timeline -->
    <div class="glass rounded-xl p-6">
      <h3 class="font-semibold text-white mb-5">🏁 Milestone Tracker</h3>
      <div class="space-y-4">
        \${[
          { month: 1, title: 'Foundation Built', status: 'done', date: 'Jan 15, 2025', detail: 'Profile optimized, 100 connections added, first posts live' },
          { month: 2, title: 'Content Engine Live', status: 'done', date: 'Feb 20, 2025', detail: '20 posts published, averaging 500 impressions, 2.4% engagement' },
          { month: 3, title: 'Engagement Spike', status: 'done', date: 'Mar 18, 2025', detail: 'Engagement rate crossed 3%, first article went semi-viral' },
          { month: 4, title: 'Network Breakthrough', status: 'active', date: 'Apr — In Progress', detail: 'Target: 500 new followers, 50 key connections — 60% done' },
          { month: 6, title: 'Thought Leader Status', status: 'pending', date: 'Jun 2025', detail: 'Regular articles, speaking invites, media mentions' },
          { month: 9, title: 'Industry Recognition', status: 'pending', date: 'Sep 2025', detail: 'LinkedIn Top Voice nomination, award submissions' },
          { month: 12, title: '🏆 Goal Achieved!', status: 'pending', date: 'Dec 2025', detail: 'Full objective completion — primary KPIs hit' }
        ].map(m => \`
          <div class="timeline-item">
            <div class="relative flex flex-col items-center" style="width:44px; flex-shrink:0">
              <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                \${m.status === 'done' ? 'bg-green-500 text-white' : m.status === 'active' ? 'grad-linkedin text-white' : 'bg-slate-700 text-slate-400'}">
                \${m.status === 'done' ? '<i class="fas fa-check"></i>' : m.status === 'active' ? '<i class="fas fa-spinner fa-spin text-xs"></i>' : m.month}
              </div>
            </div>
            <div class="pb-4 flex-1">
              <div class="flex items-center gap-2 mb-0.5 flex-wrap">
                <span class="text-sm font-semibold text-white">\${m.title}</span>
                <span class="badge \${m.status === 'done' ? 'badge-green' : m.status === 'active' ? 'badge-blue' : 'text-slate-600 bg-slate-800'} text-xs">
                  \${m.status === 'done' ? '✅ Completed' : m.status === 'active' ? '🔄 In Progress' : '⏳ Upcoming'}
                </span>
              </div>
              <div class="text-xs text-slate-500 mb-1">📅 \${m.date}</div>
              <div class="text-xs text-slate-400">\${m.detail}</div>
            </div>
          </div>
        \`).join('')}
      </div>
    </div>

    <!-- AI Recommendations -->
    <div class="glass rounded-xl p-5">
      <h3 class="font-semibold text-white mb-4">💡 AI Recommendations to Accelerate</h3>
      <div class="space-y-3">
        \${[
          { priority: 'High', action: 'Increase posting to 5x/week (currently 3x)', impact: '+40% reach', color: 'red' },
          { priority: 'High', action: 'Add video content — it gets 3x more engagement on LinkedIn', impact: '+65% engagement', color: 'red' },
          { priority: 'Medium', action: 'Engage with 20 posts before publishing your own each day', impact: '+25% algorithm boost', color: 'yellow' },
          { priority: 'Medium', action: 'Reply to every comment within 2 hours of publishing', impact: '+50% thread growth', color: 'yellow' },
          { priority: 'Low', action: 'Optimize posting time to Tue/Wed 8-10am for your audience', impact: '+15% impressions', color: 'blue' }
        ].map(r => \`
          <div class="flex items-start gap-3 p-3 rounded-lg bg-slate-800/40">
            <span class="badge \${r.color === 'red' ? 'badge-red' : r.color === 'yellow' ? 'badge-yellow' : 'badge-blue'} flex-shrink-0">\${r.priority}</span>
            <div class="flex-1 text-sm text-slate-300">\${r.action}</div>
            <div class="badge badge-green flex-shrink-0 text-xs">\${r.impact}</div>
          </div>
        \`).join('')}
      </div>
    </div>
  </div>
  \`;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENTS & INTERACTIONS
// ═══════════════════════════════════════════════════════════════════════════
function attachEvents() {
  // Charts
  if (STATE.screen === 'dashboard') {
    setTimeout(() => {
      initCharts();
    }, 100);
  }

  // Progress ring animation for step 4
  if (STATE.step === 4) {
    setTimeout(() => {
      const ring = document.getElementById('progress-ring');
      if (ring) ring.style.strokeDashoffset = '0';
      const messages = [
        '🧠 Analyzing your LinkedIn profile...',
        '📊 Processing industry benchmarks...',
        '🎯 Calibrating to your objective...',
        '📅 Building 12-month roadmap...',
        '✍️ Crafting content strategy...',
        '🚀 Finalizing your personal brand plan...'
      ];
      let idx = 0;
      const interval = setInterval(() => {
        idx++;
        if (idx < messages.length) {
          const el = document.getElementById('ai-status');
          if (el) el.textContent = messages[idx];

          // Mark previous step as done
          const prevIcon = document.getElementById('step-icon-' + (idx-1));
          const prevMsg = document.getElementById('step-msg-' + (idx-1));
          if (prevIcon) prevIcon.innerHTML = '<i class="fas fa-check text-white" style="font-size:8px"></i>';
          if (prevIcon) prevIcon.className = 'w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-xs flex-shrink-0';
          if (prevMsg) prevMsg.className = 'flex items-center gap-2 text-xs text-slate-500 transition-colors';

          // Mark current as running
          const curIcon = document.getElementById('step-icon-' + idx);
          const curMsg = document.getElementById('step-msg-' + idx);
          if (curIcon) curIcon.innerHTML = '<i class="fas fa-spinner fa-spin text-white" style="font-size:8px"></i>';
          if (curIcon) curIcon.className = 'w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-xs flex-shrink-0';
          if (curMsg) curMsg.className = 'flex items-center gap-2 text-xs text-slate-300 transition-colors';
        } else {
          clearInterval(interval);
        }
      }, 600);
    }, 200);
  }
}

function initCharts() {
  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 10 } } }
    }
  };

  // Impressions chart (overview tab)
  const impCtx = document.getElementById('impressions-chart');
  if (impCtx) {
    new Chart(impCtx, {
      type: 'bar',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          data: [3200, 4100, 5800, 3900, 4700, 2800, 3900],
          backgroundColor: 'rgba(0,119,181,0.4)',
          borderColor: '#0077B5',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: { ...chartDefaults }
    });
  }

  // Follower chart (analytics tab)
  const folCtx = document.getElementById('follower-chart');
  if (folCtx) {
    new Chart(folCtx, {
      type: 'line',
      data: {
        labels: ['Wk1','Wk2','Wk3','Wk4','Wk5','Wk6','Wk7','Wk8','Wk9','Wk10','Wk11','Wk12'],
        datasets: [{
          data: [2200, 2280, 2350, 2420, 2480, 2530, 2590, 2640, 2700, 2760, 2800, 2847],
          borderColor: '#0077B5',
          backgroundColor: 'rgba(0,119,181,0.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#0077B5',
          pointRadius: 3
        }]
      },
      options: { ...chartDefaults }
    });
  }

  // Engagement by content type (analytics tab)
  const engCtx = document.getElementById('engagement-chart');
  if (engCtx) {
    new Chart(engCtx, {
      type: 'bar',
      data: {
        labels: ['Posts', 'Articles', 'Stories', 'Reposts', 'Videos', 'Polls'],
        datasets: [{
          data: [4.8, 7.2, 10.5, 2.1, 9.3, 6.7],
          backgroundColor: ['#0077B5','#7C3AED','#059669','#D97706','#DC2626','#0EA5E9'].map(c => c + '80'),
          borderColor: ['#0077B5','#7C3AED','#059669','#D97706','#DC2626','#0EA5E9'],
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: { ...chartDefaults, scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, ticks: { ...chartDefaults.scales.y.ticks, callback: v => v + '%' } } } }
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════
function nextStep() {
  if (STATE.step === 1) {
    const linkedinId = document.getElementById('inp-linkedin-id')?.value;
    const name = document.getElementById('inp-name')?.value;
    if (!linkedinId || !name) { showToast('Please fill in your LinkedIn ID and Name', 'error'); return; }
    STATE.user = {
      linkedinId, name,
      headline: document.getElementById('inp-headline')?.value || '',
      industry: document.getElementById('inp-industry')?.value || '',
      followers: parseInt(document.getElementById('inp-followers')?.value) || 500
    };
    STATE.step = 2;
  } else if (STATE.step === 2) {
    if (!STATE.objective) { showToast('Please select your primary objective', 'error'); return; }
    STATE.step = 3;
  } else if (STATE.step === 3) {
    STATE.tone = document.querySelector('.tone-btn.selected')?.textContent?.trim() || 'Professional';
    STATE.user.targetAudience = document.getElementById('inp-audience')?.value || '';
    STATE.user.expertise = document.getElementById('inp-expertise')?.value || '';
    STATE.step = 4;
  }
  render();
}

function prevStep() {
  if (STATE.step > 1) { STATE.step--; render(); }
}

function selectObjective(id) {
  STATE.objective = id;
  document.querySelectorAll('.objective-card').forEach(el => el.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
}

function selectTone(tone) {
  STATE.tone = tone;
  document.querySelectorAll('.tone-btn').forEach(el => el.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
}

async function generateStrategy() {
  try {
    const res = await axios.post('/api/strategy/generate', {
      objective: STATE.objective,
      currentFollowers: STATE.user?.followers || 500,
      industry: STATE.user?.industry || 'Technology',
      targetAudience: STATE.user?.targetAudience || '',
      linkedinId: STATE.user?.linkedinId || ''
    });
    STATE.strategy = res.data;
    STATE.screen = 'strategy';
    render();
  } catch (e) {
    // Fallback with demo data
    STATE.strategy = { strategy: getDemoStrategy() };
    STATE.screen = 'strategy';
    render();
  }
}

function getDemoStrategy() {
  return {
    title: 'Network Building & Community Strategy',
    icon: '🌐',
    description: 'Focus on growing a high-quality, engaged professional network',
    kpis: [
      { metric: 'New Connections', target: '100+/month' },
      { metric: 'Follower Growth', target: '500+/month' },
      { metric: 'Engagement Rate', target: '5%+' },
      { metric: 'Comments Received', target: '50+/week' }
    ],
    contentPillars: [
      { name: 'Value-Add Content', percentage: 40, icon: '🎁', color: '#10B981' },
      { name: 'Community Stories', percentage: 25, icon: '📖', color: '#3B82F6' },
      { name: 'Collaborations', percentage: 20, icon: '🤝', color: '#F59E0B' },
      { name: 'Trending Topics', percentage: 15, icon: '🔥', color: '#EF4444' }
    ],
    monthlyPlan: [
      { month: 1, title: 'Foundation', tasks: ['Audit existing network', 'Identify 100 targets', 'Post 3x/week', 'Comment on 30 posts'], milestone: '100 new connections' },
      { month: 2, title: 'Content Engine', tasks: ['Post 5x/week', 'Launch insight series', 'Engage communities', 'Collaborate with 2 peers'], milestone: '1K impressions avg' },
      { month: 3, title: 'Community Leadership', tasks: ['Host LinkedIn Live', 'Start Newsletter', 'Feature others', 'Respond to all comments'], milestone: '500 new followers' },
      { month: 4, title: 'Cross-Platform Amplification', tasks: ['Repurpose content', 'Join groups', 'Get mentioned', 'Interview leaders'], milestone: '5% engagement rate' },
      { month: 5, title: 'Influence Building', tasks: ['Weekly articles', 'Speak at events', 'Original research', 'Build referral network'], milestone: '2K followers' },
      { month: 6, title: 'Scale & Systematize', tasks: ['Automate calendar', 'Build ambassadors', 'Launch collaborations', 'Set next goals'], milestone: 'Sustainable growth' }
    ],
    weeklyActions: [
      { day: 'Mon', actions: ['Post thought piece (8am)', 'Connect 15 people', 'Comment 10 posts'] },
      { day: 'Tue', actions: ['Engage community', 'Share curated content', 'Reply to comments'] },
      { day: 'Wed', actions: ['Publish insight (10am)', 'Host group discussion', 'Feature a connection'] },
      { day: 'Thu', actions: ['Share trending news', 'Send 5 DMs', 'Engage influencers'] },
      { day: 'Fri', actions: ['Post success story', 'Connect 10 people', 'Review analytics'] },
      { day: 'Sat', actions: ['Light engagement', 'Content research', 'Reply to messages'] },
      { day: 'Sun', actions: ['Plan next week', 'Batch content', 'Analytics review'] }
    ],
    targetPersonas: ['Industry Leaders', 'Peers', 'Community Champions', 'Influencers']
  };
}

function enterDashboard() {
  STATE.screen = 'dashboard';
  STATE.activeTab = 'overview';
  render();
}

function setTab(tab) {
  STATE.activeTab = tab;
  if (tab === 'approvals') STATE.notifications = 0;
  render();
}

function handleApproval(id, action) {
  const el = document.getElementById('approval-' + id);
  if (el) {
    if (action === 'approve') {
      el.style.background = 'rgba(16,185,129,0.1)';
      el.style.borderLeftColor = '#10B981';
      el.innerHTML = el.innerHTML.replace(/<div class="flex gap-2[^>]*>.*?<\\/div>/s, '');
      setTimeout(() => { el.style.display = 'none'; }, 800);
      showToast('✅ Content approved and scheduled!', 'success');
    } else if (action === 'reject') {
      el.style.background = 'rgba(239,68,68,0.05)';
      setTimeout(() => { el.style.display = 'none'; }, 800);
      showToast('❌ Content rejected and removed', 'error');
    } else {
      showToast('✏️ Content opened for editing', 'info');
    }
  }
}

async function generateDailyContent() {
  showToast('🤖 AI generating personalized content batch...', 'info');
  await new Promise(r => setTimeout(r, 1500));
  showToast('✅ 3 new pieces of content ready for approval!', 'success');
  STATE.notifications = (STATE.notifications || 0) + 3;
  setTimeout(() => { setTab('approvals'); }, 1000);
}

// ═══════════════════════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.innerHTML = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(10px)'; toast.style.transition = 'all 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════
render();
</script>
</body>
</html>
`;
}

export default app
