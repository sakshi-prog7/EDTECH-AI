/**
 * Local Deterministic AI Engine — EDTECH AI
 *
 * All AI features work without external API keys. Every function is:
 * - Deterministic (same input → same output)
 * - Explainable (returns reasons/factors)
 * - Based on real application data
 * - Never returns undefined/null/empty
 */

/* ==================== Types ==================== */

export interface LeadData {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  source: string
  status: string
  priority: string
  course_interest?: string | null
  engagement: number
  interactions: number
  score?: number | null
  score_reason?: string | null
  notes?: string | null
  last_activity?: string | null
  created_at: string
}

export interface StudentData {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  academic_level?: string | null
  interests?: string | null
  lead_id?: string | null
  created_at: string
}

export interface CourseData {
  id: string
  code: string
  title: string
  category: string
  duration_weeks: number
  fees: number
  eligibility?: string | null
  description?: string | null
  status: string
}

export interface LeadScoreResult {
  score: number
  classification: 'HOT' | 'WARM' | 'COLD'
  reasons: string[]
  nextAction: string
  recommendedCourse?: string
}

export interface NextBestActionResult {
  action: string
  reason: string
  timing: string
  priority: 'High' | 'Medium' | 'Low'
}

export interface CourseRecommendation {
  courseId: string
  courseName: string
  matchPercentage: number
  matchingSkills: string[]
  missingSkills: string[]
  careerRelevance: string
  reason: string
  alternativeCourse?: string
}

export interface EmailGeneration {
  subject: string
  body: string
  personalized: boolean
}

export interface StudentProfile {
  strengths: string[]
  interests: string[]
  suitableCourses: string[]
  careerDirection: string
  recommendedNextAction: string
  riskLevel: 'Low' | 'Medium' | 'High'
  engagementScore: number
}

export interface AiInsight {
  id: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'success' | 'danger'
  type: string
}

/* ==================== Helpers ==================== */

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function deterministicHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

const COURSE_CATALOG = [
  { name: 'Data Science', category: 'Data Science', keywords: ['data', 'analytics', 'statistics', 'python', 'ml', 'machine learning'], career: 'Data Analyst, Data Engineer, ML Engineer' },
  { name: 'AI & Machine Learning', category: 'Artificial Intelligence', keywords: ['ai', 'machine learning', 'ml', 'python', 'models', 'nlp', 'deep learning'], career: 'AI Engineer, ML Researcher, Data Scientist' },
  { name: 'Full Stack Development', category: 'Web Development', keywords: ['web', 'frontend', 'backend', 'javascript', 'react', 'node', 'coding', 'programming'], career: 'Full Stack Developer, Web Developer, Software Engineer' },
  { name: 'Cloud Computing', category: 'Cloud Computing', keywords: ['cloud', 'aws', 'azure', 'devops', 'infrastructure', 'server'], career: 'Cloud Engineer, DevOps Engineer, Solutions Architect' },
  { name: 'Cyber Security', category: 'Cyber Security', keywords: ['security', 'cyber', 'network', 'hacking', 'protection', 'encryption'], career: 'Security Analyst, Penetration Tester, CISO' },
  { name: 'Business Analytics', category: 'Business Analytics', keywords: ['business', 'analytics', 'excel', 'power bi', 'tableau', 'reporting'], career: 'Business Analyst, BI Developer, Analytics Manager' },
  { name: 'Digital Marketing', category: 'Digital Marketing', keywords: ['marketing', 'seo', 'social media', 'ads', 'content', 'brand', 'digital'], career: 'Digital Marketing Manager, SEO Specialist, Content Strategist' },
  { name: 'Product Management', category: 'Product Management', keywords: ['product', 'management', 'strategy', 'agile', 'roadmap', 'ux'], career: 'Product Manager, Scrum Master, UX Researcher' },
]

/* ==================== Lead Scoring ==================== */

const STATUS_WEIGHTS: Record<string, number> = {
  CONVERTED: 1.0,
  ENROLLED: 0.95,
  APPLICATION: 0.85,
  QUALIFIED: 0.8,
  DEMO_SCHEDULED: 0.7,
  NURTURING: 0.6,
  INTERESTED: 0.55,
  CONTACTED: 0.4,
  NEW: 0.2,
  INACTIVE: 0.1,
  LOST: 0.0,
}

const SOURCE_WEIGHTS: Record<string, number> = {
  Referral: 0.9,
  LinkedIn: 0.8,
  Website: 0.75,
  'Google Ads': 0.7,
  'Campus Event': 0.65,
  Instagram: 0.6,
  'Meta Ads': 0.6,
  'Walk-in': 0.55,
  Advertisement: 0.5,
}

export function calculateLeadScore(lead: LeadData): LeadScoreResult {
  const reasons: string[] = []
  let totalScore = 0
  let totalWeight = 0

  function addFactor(weight: number, value: number, reason: string) {
    totalScore += weight * value
    totalWeight += weight
    if (value > 0.5 && reason) reasons.push(reason)
  }

  // 1. Funnel stage (weight: 3.0) — strongest signal
  const statusScore = STATUS_WEIGHTS[lead.status] ?? 0.2
  addFactor(3.0, statusScore, `Funnel stage: ${lead.status}`)

  // 2. Engagement score (weight: 2.5)
  const engagementNorm = clamp(lead.engagement / 100, 0, 1)
  addFactor(2.5, engagementNorm, `Engagement score: ${lead.engagement}%`)

  // 3. Interaction frequency (weight: 2.0)
  const interactionNorm = clamp(lead.interactions / 12, 0, 1)
  addFactor(2.0, interactionNorm, `${lead.interactions} interactions recorded`)

  // 4. Source quality (weight: 1.5)
  const sourceWeight = SOURCE_WEIGHTS[lead.source] ?? 0.55
  addFactor(1.5, sourceWeight, lead.source ? `Channel: ${lead.source}` : '')

  // 5. Priority signal (weight: 1.0)
  const prioMap: Record<string, number> = { High: 0.9, Medium: 0.5, Low: 0.2 }
  addFactor(1.0, prioMap[lead.priority] ?? 0.5, lead.priority === 'High' ? 'High priority assigned' : '')

  // 6. Course interest match (weight: 0.5)
  if (lead.course_interest) {
    addFactor(0.5, 0.7, `Interest in ${lead.course_interest}`)
  }

  // 7. Email availability (weight: 0.3)
  if (lead.email) {
    addFactor(0.3, 0.8, 'Email address available')
  }

  // 8. Phone availability (weight: 0.2)
  if (lead.phone) {
    addFactor(0.2, 0.7, 'Phone number available')
  }

  // 9. Notes-based signals (weight: 0.5 each)
  const notes = (lead.notes || '').toLowerCase()
  if (notes.includes('high purchase intent') || notes.includes('high interest')) {
    addFactor(0.5, 0.85, 'High purchase intent noted')
  }
  if (notes.includes('demo completed') || notes.includes('demo done')) {
    addFactor(0.5, 0.75, 'Demo completed')
  }
  if (notes.includes('interested') || notes.includes('want')) {
    addFactor(0.3, 0.65, 'Expressed interest in notes')
  }
  if (notes.includes('placement') || notes.includes('career')) {
    addFactor(0.3, 0.55, 'Career/placement focused')
  }
  if (notes.includes('weekend') || notes.includes('flexible')) {
    addFactor(0.2, 0.5, 'Preferred schedule flexibility')
  }

  // 10. Recency bonus
  if (lead.last_activity) {
    const daysAgo = Math.max(0, Math.floor(
      (Date.now() - new Date(lead.last_activity).getTime()) / (1000 * 60 * 60 * 24)
    ))
    const recency = clamp(1 - daysAgo / 30, 0, 1)
    addFactor(1.0, recency, daysAgo < 7 ? `Active ${daysAgo}d ago` : '')
  }

  const raw = totalWeight > 0 ? totalScore / totalWeight : 0
  const score = clamp(Math.round(raw * 100), 0, 100)

  let classification: 'HOT' | 'WARM' | 'COLD'
  if (score >= 70) classification = 'HOT'
  else if (score >= 45) classification = 'WARM'
  else classification = 'COLD'

  if (reasons.length === 0) {
    reasons.push('Limited engagement signals in the record')
  }

  const nextAction = getNextBestActionForScore(score, lead.status, lead.course_interest || undefined, notes)

  return {
    score,
    classification,
    reasons: reasons.slice(0, 5),
    nextAction: nextAction.action,
    recommendedCourse: lead.course_interest || undefined,
  }
}

/* ==================== Next Best Action ==================== */

function getNextBestActionForScore(
  score: number,
  status: string,
  courseInterest?: string,
  notes?: string,
): NextBestActionResult {
  const notesLower = (notes || '').toLowerCase()
  const hasWeekend = notesLower.includes('weekend') || notesLower.includes('flexible')
  const hasFeeConcern = notesLower.includes('fee') || notesLower.includes('cost') || notesLower.includes('price')
  const hasPlacement = notesLower.includes('placement') || notesLower.includes('job') || notesLower.includes('career')

  let action: string
  let reason: string
  let timing: string
  let priority: 'High' | 'Medium' | 'Low'

  if (status === 'NEW') {
    action = 'Call within 1 hour — lead just showed interest'
    reason = 'New lead with no contact yet — fast response increases conversion by 40%'
    timing = 'Within 1 hour'
    priority = 'High'
  } else if (status === 'CONTACTED') {
    action = 'Follow up with personalized course recommendation and schedule demo'
    reason = 'Lead has been contacted but not yet qualified — keep momentum'
    timing = 'Within 24 hours'
    priority = 'High'
  } else if (status === 'INTERESTED') {
    action = `Send detailed ${courseInterest || 'course'} information and schedule counselor demo`
    reason = 'Lead expressed interest — capitalize on engagement window'
    timing = 'Within 24 hours'
    priority = 'High'
  } else if (status === 'DEMO_SCHEDULED') {
    action = 'Send demo reminder with preparation details and agenda'
    reason = 'Demo is scheduled — ensure lead attends with full context'
    timing = '2 hours before demo'
    priority = 'High'
  } else if (status === 'QUALIFIED') {
    action = 'Send application form, fee structure, and scholarship details'
    reason = 'Lead is qualified — move to application stage'
    timing = 'Immediately'
    priority = 'High'
  } else if (status === 'APPLICATION') {
    action = 'Assist with application completion and follow up on status'
    reason = 'Application pending — help remove friction points'
    timing = 'Within 48 hours'
    priority = 'Medium'
  } else if (status === 'NURTURING') {
    if (hasFeeConcern) {
      action = 'Share scholarship options, EMI plans, and financial aid details'
      reason = 'Lead concerned about fees — address cost barrier proactively'
      timing = 'Within 24 hours'
      priority = 'High'
    } else if (hasPlacement) {
      action = 'Share placement statistics, success stories, and career outcomes'
      reason = 'Lead focused on career outcomes — provide social proof'
      timing = 'Within 24 hours'
      priority = 'Medium'
    } else if (hasWeekend) {
      action = 'Share weekend batch schedule and flexibility options'
      reason = 'Lead prefers flexible scheduling — show available options'
      timing = 'Within 24 hours'
      priority = 'Medium'
    } else {
      action = 'Share success stories, program highlights, and limited-time offers'
      reason = 'Nurturing stage — maintain engagement with valuable content'
      timing = 'In 2-3 days'
      priority = 'Medium'
    }
  } else if (status === 'INACTIVE') {
    action = 'Send re-engagement email with special offer or new program update'
    reason = 'Lead has gone inactive — re-engage with fresh value proposition'
    timing = 'This week'
    priority = 'Low'
  } else if (status === 'LOST') {
    action = 'Send win-back email with new offers or different program recommendation'
    reason = 'Previously lost lead — try alternative approach'
    timing = 'When new offer available'
    priority = 'Low'
  } else if (status === 'CONVERTED' || status === 'ENROLLED') {
    action = 'Welcome and send onboarding materials; request referral'
    reason = 'Successfully converted — focus on retention and referrals'
    timing = 'Immediately'
    priority = 'Medium'
  } else {
    action = 'Send follow-up email with program highlights and schedule a call'
    reason = 'Default action — maintain touchpoint'
    timing = 'Within 3 days'
    priority = 'Low'
  }

  return { action, reason, timing, priority }
}

export function getNextBestAction(lead: LeadData): NextBestActionResult {
  const score = calculateLeadScore(lead)
  return getNextBestActionForScore(
    score.score,
    lead.status,
    lead.course_interest || undefined,
    lead.notes || undefined,
  )
}

/* ==================== Course Recommendation ==================== */

export function recommendCourse(
  profile: { interests?: string; academic_level?: string; name?: string; course_interest?: string; notes?: string },
  courses: CourseData[] = [],
): CourseRecommendation[] {
  const interestText = [profile.interests, profile.course_interest, profile.notes]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const academicLevel = (profile.academic_level || '').toLowerCase()

  // Score each course against the profile
  const results: CourseRecommendation[] = []

  const allCourses = courses.length > 0
    ? courses.filter(c => c.status === 'active').map(c => ({
        name: c.title,
        category: c.category,
        keywords: c.title.toLowerCase().split(/\s+/),
        id: c.id,
        description: c.description || '',
        eligibility: c.eligibility || '',
      }))
    : COURSE_CATALOG.map((c, i) => ({
        name: c.name,
        category: c.category,
        keywords: c.keywords,
        id: `local-${i}`,
        description: '',
        eligibility: '',
      }))

  for (const course of allCourses) {
    const matchedKeywords = course.keywords.filter(kw => interestText.includes(kw))
    const keywordScore = matchedKeywords.length > 0 ? Math.min(1, matchedKeywords.length / 2) : 0.15

    // Academic fit
    let academicFit = 0.6
    if (academicLevel.includes('master') || academicLevel.includes('working')) academicFit = 0.9
    else if (academicLevel.includes('bachelor')) academicFit = 0.75
    else academicFit = 0.5

    const matchPercentage = clamp(Math.round((0.65 * keywordScore + 0.35 * academicFit) * 100), 10, 99)

    const missingKeywords = course.keywords.filter(kw => !interestText.includes(kw))

    const matchingSkills = matchedKeywords.length > 0
      ? matchedKeywords.map(k => k.charAt(0).toUpperCase() + k.slice(1))
      : [course.category]

    results.push({
      courseId: course.id,
      courseName: course.name,
      matchPercentage,
      matchingSkills,
      missingSkills: missingKeywords.slice(0, 3).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
      careerRelevance: COURSE_CATALOG.find(c => c.name === course.name)?.career || `${course.category} professional roles`,
      reason: matchedKeywords.length > 0
        ? `Profile aligns with ${course.category.toLowerCase()} interests (${matchedKeywords.slice(0, 2).join(', ')})`
        : `Relevant ${course.category.toLowerCase()} track based on academic background`,
    })
  }

  results.sort((a, b) => b.matchPercentage - a.matchPercentage)
  return results.slice(0, 4)
}

/* ==================== Email Generation ==================== */

export function generateOutreachEmail(lead: LeadData, tone: string = 'professional'): EmailGeneration {
  const course = lead.course_interest || 'your program'
  const score = calculateLeadScore(lead)
  const notes = (lead.notes || '').toLowerCase()

  // Score-based context
  let scoreContext = ''
  if (score.score >= 75) scoreContext = " We're excited about your strong interest in the program."
  else if (score.score >= 50) scoreContext = " We appreciate your growing interest."
  else scoreContext = " We'd love to learn more about what you're looking for."

  // Source-based context
  const sourceContext = lead.source && !['Website', ''].includes(lead.source)
    ? ` We noticed you found us through ${lead.source} — great choice!`
    : ''

  // Notes-based signals
  let notesSignals = ''
  if (notes.includes('weekend') || notes.includes('flexible')) {
    notesSignals = ' We also offer flexible scheduling including weekend batches to fit your needs.'
  } else if (notes.includes('fee') || notes.includes('cost') || notes.includes('price')) {
    notesSignals = ' We understand budget matters — we have flexible payment plans and scholarship options available.'
  } else if (notes.includes('placement') || notes.includes('job') || notes.includes('career')) {
    notesSignals = ' Our program includes dedicated career placement assistance with a strong track record.'
  } else if (notes.includes('demo') || notes.includes('trial')) {
    notesSignals = " We'd love to arrange a demo session so you can experience the program firsthand."
  } else if (notes.includes('interested') || notes.includes('details')) {
    notesSignals = ' We have detailed program information and would be happy to walk you through it.'
  }

  // Status-based subject
  let subject = `Following up on your ${course} interest`
  if (lead.status === 'NEW') subject = `Welcome! Your ${course} learning journey starts here`
  else if (lead.status === 'CONTACTED') subject = `Thanks for connecting — here's your ${course} info`
  else if (['INTERESTED', 'NURTURING'].includes(lead.status)) subject = `Your personalized ${course} roadmap is ready`
  else if (lead.status === 'DEMO_SCHEDULED') subject = `Demo reminder — ${course} program`
  else if (lead.status === 'QUALIFIED') subject = `Great news — you qualify for ${course}!`
  else if (lead.status === 'APPLICATION') subject = `Application update — ${course} program`
  else if (lead.status === 'INACTIVE') subject = `We miss you, ${lead.name}! ${course} seats still available`
  else if (lead.status === 'LOST') subject = `${lead.name}, a special offer for ${course}`

  // Greeting based on score
  const greeting = score.score >= 80 ? `Hi ${lead.name}! 🎯`
    : score.score >= 60 ? `Hi ${lead.name}! 👋`
    : `Dear ${lead.name},`

  // CTA based on status
  let cta = ''
  if (lead.status === 'NEW') cta = "Would you like to schedule a quick 15-minute call to discuss how this program aligns with your career goals?"
  else if (['CONTACTED', 'INTERESTED'].includes(lead.status)) cta = "I'd love to help you take the next step. Would you prefer a call or a demo session?"
  else if (lead.status === 'DEMO_SCHEDULED') cta = "Just a friendly reminder about your upcoming demo session. Shall I confirm the time?"
  else if (lead.status === 'QUALIFIED') cta = "You qualify for our program! Would you like me to send the application form?"
  else if (lead.status === 'APPLICATION') cta = "Need any help with your application? I'm here to assist you through the process."
  else if (lead.status === 'ENROLLED') cta = "Welcome aboard! Your orientation materials are ready — let me know if you have any questions."
  else if (['INACTIVE', 'LOST'].includes(lead.status)) cta = "We'd love to reconnect. Would you like to schedule a quick chat to discuss your current needs?"
  else cta = "Feel free to reply to this email or call us anytime — we're here to help."

  // Build body based on tone
  let body = ''
  if (tone === 'professional') {
    body = `<p>${greeting}</p>
<p>Thank you for your interest in our <strong>${course}</strong> program.${scoreContext}${sourceContext}${notesSignals}</p>
<p>${cta}</p>
<p>Our admissions team is available to discuss the curriculum, fee structure, and scholarship opportunities.</p>
<p>Best regards,<br>Admissions Team<br>EDTECH AI</p>`
  } else if (tone === 'friendly') {
    body = `<p>${greeting}</p>
<p>Just checking in about the <strong>${course}</strong> program you were interested in.${scoreContext}${sourceContext}${notesSignals}</p>
<p>${cta}</p>
<p>We'd love to help you take the next step! Feel free to reach out anytime.</p>
<p>Cheers,<br>The EDTECH AI Team</p>`
  } else if (tone === 'urgent') {
    body = `<p>${greeting}</p>
<p>This is a quick reminder that seats for our <strong>${course}</strong> program are filling up quickly. We'd hate for you to miss out!${notesSignals}</p>
<p>${cta}</p>
<p>Our enrollment window closes soon. Reply to this email or call us to secure your spot.</p>
<p>Best,<br>Admissions Team<br>EDTECH AI</p>`
  }

  return { subject, body, personalized: true }
}

/* ==================== Email Personalization ==================== */

export function personalizeEmail(
  lead: LeadData,
  currentSubject: string,
  currentBody: string,
): EmailGeneration {
  const score = calculateLeadScore(lead)
  const course = lead.course_interest || 'your program'

  // Add personalized elements based on lead data
  let personalizedBody = currentBody

  // Add score-based urgency
  if (score.score >= 80) {
    personalizedBody = personalizedBody.replace(
      '<p>Best regards',
      `<p>Given your high engagement with our program, we'd like to offer you priority enrollment with a personalized counselor assignment.</p>
<p>Best regards`
    )
  }

  // Add location-based personalization if available
  const notes = (lead.notes || '').toLowerCase()
  if (notes.includes('placement')) {
    personalizedBody = personalizedBody.replace(
      '<p>Best regards',
      `<p>Our graduates have been placed at top companies with an average salary increase of 40%. We'd love to share detailed placement statistics with you.</p>
<p>Best regards`
    )
  }

  // Personalize subject with lead name
  let personalizedSubject = currentSubject
  if (!personalizedSubject.includes(lead.name)) {
    personalizedSubject = `${lead.name} — ${personalizedSubject}`
  }

  return {
    subject: personalizedSubject,
    body: personalizedBody,
    personalized: true,
  }
}

/* ==================== Student Profile ==================== */

export function generateStudentProfile(student: StudentData, courses: CourseData[] = []): StudentProfile {
  const interests = (student.interests || '').toLowerCase()
  const academic = (student.academic_level || '').toLowerCase()

  // Strengths
  const strengths: string[] = []
  if (academic.includes('master')) strengths.push('Advanced academic background')
  else if (academic.includes('bachelor')) strengths.push('Solid academic foundation')
  else if (academic.includes('working')) strengths.push('Professional experience')

  if (interests.includes('data') || interests.includes('analytics')) strengths.push('Data analytics interest')
  if (interests.includes('ai') || interests.includes('machine learning')) strengths.push('AI/ML aptitude')
  if (interests.includes('programming') || interests.includes('development')) strengths.push('Development skills')
  if (interests.includes('marketing')) strengths.push('Marketing awareness')
  if (interests.includes('business')) strengths.push('Business acumen')

  if (strengths.length === 0) strengths.push('Eager to learn', 'Exploring career options')

  // Interests
  const interestList: string[] = []
  if (interests.includes('data')) interestList.push('Data Science')
  if (interests.includes('ai') || interests.includes('machine learning')) interestList.push('Artificial Intelligence')
  if (interests.includes('marketing')) interestList.push('Digital Marketing')
  if (interests.includes('business') || interests.includes('analytics')) interestList.push('Business Analytics')
  if (interests.includes('cloud')) interestList.push('Cloud Computing')
  if (interests.includes('security') || interests.includes('cyber')) interestList.push('Cybersecurity')
  if (interests.includes('full stack') || interests.includes('web') || interests.includes('development')) interestList.push('Full Stack Development')

  if (interestList.length === 0 && student.interests) interestList.push(student.interests)
  if (interestList.length === 0) interestList.push('Exploring options')

  // Suitable courses
  const suitableCourses = COURSE_CATALOG
    .filter(c => c.keywords.some(kw => interests.includes(kw)))
    .map(c => c.name)
  if (suitableCourses.length === 0) suitableCourses.push('General Fundamentals', 'Career Exploration Workshop')

  // Career direction
  const matchingCourse = COURSE_CATALOG.find(c => c.keywords.some(kw => interests.includes(kw)))
  const careerDirection = matchingCourse?.career || 'Multiple career paths available based on interests'

  // Risk level based on academic and engagement signals
  let riskLevel: 'Low' | 'Medium' | 'High' = 'Low'
  if (academic.includes('working')) riskLevel = 'Low'
  else if (academic.includes('bachelor')) riskLevel = 'Low'
  else if (!academic) riskLevel = 'Medium'

  // Engagement score
  const engagementScore = academic.includes('working') ? 85
    : academic.includes('master') ? 80
    : academic.includes('bachelor') ? 70
    : 55

  // Recommended next action
  let recommendedNextAction = 'Schedule a counseling session to discuss course options and career goals.'
  if (academic.includes('working')) recommendedNextAction = 'Recommend fast-track programs that accommodate professional schedules.'
  else if (academic.includes('master')) recommendedNextAction = 'Recommend advanced specialization courses aligned with career goals.'
  else if (academic.includes('bachelor')) recommendedNextAction = 'Share course comparison guide and schedule a demo class.'

  return {
    strengths,
    interests: interestList,
    suitableCourses,
    careerDirection,
    recommendedNextAction,
    riskLevel,
    engagementScore,
  }
}

/* ==================== AI Insights ==================== */

export function generateAIInsights(
  leads: LeadData[],
  students: StudentData[],
  courses: CourseData[],
): AiInsight[] {
  const insights: AiInsight[] = []

  // Lead insights
  const activeLeads = leads.filter(l => !['CONVERTED', 'LOST'].includes(l.status))
  const hotLeads = activeLeads.filter(l => {
    const score = calculateLeadScore(l)
    return score.score >= 70
  })
  const coldLeads = activeLeads.filter(l => {
    const score = calculateLeadScore(l)
    return score.score < 45
  })
  const needFollowUp = activeLeads.filter(l =>
    ['NEW', 'CONTACTED', 'NURTURING'].includes(l.status) && ['High', 'Medium'].includes(l.priority)
  )

  if (hotLeads.length > 0) {
    insights.push({
      id: 'hot-leads',
      title: 'Hot Leads Ready for Conversion',
      message: `${hotLeads.length} lead${hotLeads.length > 1 ? 's' : ''} scored 70+ and are ready for immediate outreach. Prioritize these for maximum conversion.`,
      severity: 'success',
      type: 'leads',
    })
  }

  if (needFollowUp.length > 0) {
    insights.push({
      id: 'followup-needed',
      title: 'Leads Needing Immediate Follow-up',
      message: `${needFollowUp.length} lead${needFollowUp.length > 1 ? 's' : ''} require follow-up based on priority and status. Delayed response reduces conversion rates.`,
      severity: 'warning',
      type: 'leads',
    })
  }

  if (coldLeads.length > 0) {
    insights.push({
      id: 'cold-leads',
      title: 'Cold Leads Need Re-engagement',
      message: `${coldLeads.length} lead${coldLeads.length > 1 ? 's' : ''} have low engagement scores. Consider re-engagement campaigns or nurture sequences.`,
      severity: 'info',
      type: 'leads',
    })
  }

  // Course insights
  const courseInterests = leads.reduce<Record<string, number>>((acc, l) => {
    if (l.course_interest) acc[l.course_interest] = (acc[l.course_interest] || 0) + 1
    return acc
  }, {})

  const topCourse = Object.entries(courseInterests).sort((a, b) => b[1] - a[1])[0]
  if (topCourse) {
    insights.push({
      id: 'top-course',
      title: 'Most In-Demand Course',
      message: `"${topCourse[0]}" is the most requested course with ${topCourse[1]} lead${topCourse[1] > 1 ? 's' : ''} expressing interest. Consider capacity planning.`,
      severity: 'info',
      type: 'courses',
    })
  }

  // Student insights
  if (students.length > 0) {
    const withInterests = students.filter(s => s.interests)
    insights.push({
      id: 'student-engagement',
      title: 'Student Profile Analysis',
      message: `${students.length} student${students.length > 1 ? 's' : ''} in the system. ${withInterests.length} have course interests recorded — use AI Student Profile for personalized recommendations.`,
      severity: 'info',
      type: 'students',
    })
  }

  // Conversion opportunity
  const qualifiedLeads = activeLeads.filter(l => l.status === 'QUALIFIED')
  if (qualifiedLeads.length > 0) {
    insights.push({
      id: 'conversion-opportunity',
      title: 'Conversion Opportunities',
      message: `${qualifiedLeads.length} lead${qualifiedLeads.length > 1 ? 's' : ''} in QUALIFIED stage — ready for application push. High conversion probability at this stage.`,
      severity: 'success',
      type: 'conversion',
    })
  }

  // Source performance
  const sourceCounts = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.source] = (acc[l.source] || 0) + 1
    return acc
  }, {})
  const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]
  if (topSource && leads.length > 0) {
    insights.push({
      id: 'source-performance',
      title: 'Top Lead Source',
      message: `"${topSource[0]}" generates the most leads (${topSource[1]}, ${Math.round(topSource[1] / leads.length * 100)}% of total). Consider doubling down on this channel.`,
      severity: 'info',
      type: 'source',
    })
  }

  return insights.slice(0, 6)
}

/* ==================== Assistant Query Answering ==================== */

export function answerAssistantQuery(
  query: string,
  leads: LeadData[],
  students: StudentData[],
  courses: CourseData[],
): string {
  const q = query.toLowerCase().trim()

  // Hottest leads
  if (q.includes('hot') && (q.includes('lead') || q.includes('potential'))) {
    const scored = leads
      .filter(l => !['CONVERTED', 'LOST'].includes(l.status))
      .map(l => ({ lead: l, score: calculateLeadScore(l) }))
      .sort((a, b) => b.score.score - a.score.score)
      .slice(0, 5)

    if (scored.length === 0) return 'No active leads in the pipeline yet. Create some leads first!'

    const lines = scored.map((s, i) =>
      `${i + 1}. ${s.lead.name} — Score: ${s.score.score} (${s.score.classification}) | Status: ${s.lead.status} | Source: ${s.lead.source}`
    )
    return `🔥 Hottest Leads:\n\n${lines.join('\n')}\n\nThese leads have the highest conversion potential based on engagement, status, and profile completeness.`
  }

  // Follow-up leads
  if (q.includes('follow') || q.includes('need') && q.includes('contact')) {
    const needFollowUp = leads.filter(l =>
      ['NEW', 'CONTACTED', 'NURTURING'].includes(l.status) &&
      !['CONVERTED', 'LOST'].includes(l.status)
    ).slice(0, 10)

    if (needFollowUp.length === 0) return 'All leads have been followed up. Great job staying on top of things!'

    const lines = needFollowUp.map((l, i) => {
      const action = getNextBestAction(l)
      return `${i + 1}. ${l.name} [${l.status}] — Priority: ${l.priority}\n   → ${action.action}`
    })
    return `📋 Leads Needing Follow-up:\n\n${lines.join('\n\n')}\n\nOpen the Leads page to take action.`
  }

  // Course recommendation for student
  if ((q.includes('course') && q.includes('recommend')) || (q.includes('which course') || q.includes('course should'))) {
    if (students.length > 0) {
      const lastStudent = students[students.length - 1]
      const recs = recommendCourse({ interests: lastStudent.interests || '', academic_level: lastStudent.academic_level || '', name: lastStudent.name })
      const lines = recs.map((r, i) => `${i + 1}. ${r.courseName} — ${r.matchPercentage}% match\n   Why: ${r.reason}`)
      return `📚 Course Recommendations for ${lastStudent.name}:\n\n${lines.join('\n\n')}\n\nOpen Course Recommendation for detailed analysis.`
    }
    return 'No students in the system yet. Add a student first, then ask for course recommendations.'
  }

  // Email generation
  if (q.includes('email') && (q.includes('generate') || q.includes('outreach') || q.includes('compose'))) {
    if (leads.length > 0) {
      const lastLead = leads[leads.length - 1]
      const email = generateOutreachEmail(lastLead)
      return `📧 Generated Email for ${lastLead.name}:\n\nSubject: ${email.subject}\n\nTo preview and send, go to the Leads page → View Lead → AI Outreach Email section.`
    }
    return 'No leads in the system yet. Add a lead first, then generate an outreach email.'
  }

  // Why is lead score high
  if (q.includes('why') && (q.includes('score') || q.includes('high'))) {
    if (leads.length > 0) {
      const scored = leads.map(l => ({ lead: l, score: calculateLeadScore(l) }))
      const top = scored.sort((a, b) => b.score.score - a.score.score)[0]
      if (top) {
        const reasons = top.score.reasons.map(r => `  • ${r}`).join('\n')
        return `🎯 Why ${top.lead.name}'s score is ${top.score.score} (${top.score.classification}):\n\n${reasons}\n\nNext Action: ${top.score.nextAction}`
      }
    }
    return 'No leads available to analyze.'
  }

  // Today's priorities
  if (q.includes('today') || q.includes('priority') || q.includes('focus') || q.includes('briefing')) {
    const items: string[] = []

    const hotLeads = leads.filter(l => {
      const s = calculateLeadScore(l)
      return s.score >= 70 && !['CONVERTED', 'LOST'].includes(l.status)
    })
    if (hotLeads.length > 0) items.push(`🔥 ${hotLeads.length} hot lead${hotLeads.length > 1 ? 's' : ''} ready for conversion`)

    const urgentFollowUps = leads.filter(l => l.priority === 'High' && ['NEW', 'CONTACTED'].includes(l.status))
    if (urgentFollowUps.length > 0) items.push(`📞 ${urgentFollowUps.length} high-priority lead${urgentFollowUps.length > 1 ? 's' : ''} need immediate attention`)

    const qualified = leads.filter(l => l.status === 'QUALIFIED')
    if (qualified.length > 0) items.push(`📝 ${qualified.length} qualified lead${qualified.length > 1 ? 's' : ''} ready for application push`)

    if (items.length === 0) items.push('✅ No urgent items today. Great job staying on top of things!')

    return `📋 Today's Priorities:\n\n${items.join('\n')}\n\nNavigate to the Dashboard for the full AI Daily Briefing.`
  }

  // Leads without communication
  if (q.includes('no recent') || q.includes('no communication') || q.includes('inactive')) {
    const staleLeads = leads.filter(l => {
      if (!l.last_activity) return true
      const daysAgo = Math.floor((Date.now() - new Date(l.last_activity).getTime()) / (1000 * 60 * 60 * 24))
      return daysAgo > 7 && !['CONVERTED', 'LOST'].includes(l.status)
    })

    if (staleLeads.length === 0) return 'All active leads have had recent communication. Good work!'

    const lines = staleLeads.slice(0, 5).map((l, i) => {
      const lastContact = l.last_activity ? new Date(l.last_activity).toLocaleDateString() : 'Never'
      return `${i + 1}. ${l.name} — Last contact: ${lastContact} | Status: ${l.status}`
    })
    return `⏰ Leads Without Recent Communication:\n\n${lines.join('\n')}\n\nConsider reaching out to re-engage these leads.`
  }

  // Summarize student
  if (q.includes('summarize') && q.includes('student') || (q.includes('student') && q.includes('summary'))) {
    if (students.length > 0) {
      const lastStudent = students[students.length - 1]
      const profile = generateStudentProfile(lastStudent)
      return `📊 Student Summary: ${lastStudent.name}\n\n` +
        `Strengths: ${profile.strengths.join(', ')}\n` +
        `Interests: ${profile.interests.join(', ')}\n` +
        `Suitable Courses: ${profile.suitableCourses.join(', ')}\n` +
        `Career Direction: ${profile.careerDirection}\n` +
        `Risk Level: ${profile.riskLevel}\n` +
        `Next Action: ${profile.recommendedNextAction}`
    }
    return 'No students in the system yet.'
  }

  // Next action for lead
  if (q.includes('next action') || q.includes('recommend') && q.includes('lead')) {
    if (leads.length > 0) {
      const lastLead = leads[leads.length - 1]
      const action = getNextBestAction(lastLead)
      return `⚡ Next Best Action for ${lastLead.name}:\n\n` +
        `Action: ${action.action}\n` +
        `Reason: ${action.reason}\n` +
        `Timing: ${action.timing}\n` +
        `Priority: ${action.priority}`
    }
    return 'No leads in the system yet.'
  }

  // Count leads
  if (q.includes('how many') && q.includes('lead')) {
    const active = leads.filter(l => !['CONVERTED', 'LOST'].includes(l.status))
    return `📊 Lead Pipeline:\n\n` +
      `Total leads: ${leads.length}\n` +
      `Active leads: ${active.length}\n` +
      `New: ${leads.filter(l => l.status === 'NEW').length}\n` +
      `Contacted: ${leads.filter(l => l.status === 'CONTACTED').length}\n` +
      `Qualified: ${leads.filter(l => l.status === 'QUALIFIED').length}\n` +
      `Converted: ${leads.filter(l => l.status === 'CONVERTED').length}\n` +
      `Lost: ${leads.filter(l => l.status === 'LOST').length}`
  }

  // Count students
  if (q.includes('how many') && q.includes('student')) {
    return `📊 There are ${students.length} student${students.length !== 1 ? 's' : ''} in the system.`
  }

  // Count courses
  if (q.includes('how many') && (q.includes('course') || q.includes('program'))) {
    return `📊 There are ${courses.length} active course${courses.length !== 1 ? 's' : ''} in the catalog.`
  }

  // Conversion rate
  if (q.includes('conversion') || q.includes('convert')) {
    const total = leads.length
    const converted = leads.filter(l => l.status === 'CONVERTED').length
    const rate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0'
    return `📊 Conversion Rate: ${rate}% (${converted} of ${total} leads converted to enrollment).`
  }

  // Campaign performance
  if (q.includes('campaign')) {
    const sourceCounts = leads.reduce<Record<string, number>>((acc, l) => {
      acc[l.source] = (acc[l.source] || 0) + 1
      return acc
    }, {})
    const lines = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source, count]) => `  • ${source}: ${count} leads`)
    return `📊 Lead Sources:\n\n${lines.join('\n')}\n\nTotal leads: ${leads.length}`
  }

  // Help
  if (q.includes('who are you') || q.includes('what can you') || q.includes('help') || q.includes('capabilit')) {
    return "I'm the EDTECH AI Assistant 🤖 I can help with:\n\n" +
      "• Show hottest leads and conversion opportunities\n" +
      "• Identify leads needing follow-up\n" +
      "• Recommend courses for students\n" +
      "• Generate outreach emails\n" +
      "• Explain lead scores\n" +
      "• Today's sales priorities\n" +
      "• Student summaries\n" +
      "• Lead and student counts\n" +
      "• And more!\n\nAsk me anything about your data!"
  }

  // Greeting
  if (q.match(/^(hello|hi|hey)\b/)) {
    return "Hello! 👋 I'm your EDTECH AI Assistant. Ask me about your leads, students, courses, or any CRM feature — I answer from your live data."
  }

  // Default fallback — always useful
  return `I can help with questions about your leads, students, courses, and CRM operations. Try asking:\n\n` +
    `• "Show me my hottest leads"\n` +
    `• "Which leads need follow-up?"\n` +
    `• "Recommend a course for my latest student"\n` +
    `• "Generate an email for this lead"\n` +
    `• "Why is this lead score high?"\n` +
    `• "Give me today's priorities"\n` +
    `• "Summarize my latest student"`
}
