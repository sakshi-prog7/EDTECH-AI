import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { RequireAuth } from '@/components/auth/RequireAuth'
import { AppLayout } from '@/layouts/AppLayout'

/**
 * Route-level code splitting — each page is its own chunk, so the initial
 * bundle stays lean and pages load on demand. The Suspense fallback matches
 * the light app background (the sidebar/header shell stays mounted).
 */
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })))
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const LeadsPage = lazy(() => import('@/pages/LeadsPage').then((m) => ({ default: m.LeadsPage })))
const StudentsPage = lazy(() => import('@/pages/StudentsPage').then((m) => ({ default: m.StudentsPage })))
const CoursesPage = lazy(() => import('@/pages/CoursesPage').then((m) => ({ default: m.CoursesPage })))
const LeadScoringPage = lazy(() => import('@/pages/LeadScoringPage').then((m) => ({ default: m.LeadScoringPage })))
const RecommendationsPage = lazy(() => import('@/pages/RecommendationsPage').then((m) => ({ default: m.RecommendationsPage })))
const PredictiveInsightsPage = lazy(() => import('@/pages/PredictiveInsightsPage').then((m) => ({ default: m.PredictiveInsightsPage })))
const AssistantPage = lazy(() => import('@/pages/AssistantPage').then((m) => ({ default: m.AssistantPage })))
const CampaignsPage = lazy(() => import('@/pages/CampaignsPage').then((m) => ({ default: m.CampaignsPage })))
const FollowUpsPage = lazy(() => import('@/pages/FollowUpsPage').then((m) => ({ default: m.FollowUpsPage })))
const CallIntelligencePage = lazy(() => import('@/pages/CallIntelligencePage').then((m) => ({ default: m.CallIntelligencePage })))
const MeetingsPage = lazy(() => import('@/pages/MeetingsPage').then((m) => ({ default: m.MeetingsPage })))
const TasksPage = lazy(() => import('@/pages/TasksPage').then((m) => ({ default: m.TasksPage })))
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })))
const CounselorsPage = lazy(() => import('@/pages/CounselorsPage').then((m) => ({ default: m.CounselorsPage })))
const CrmIntegrationPage = lazy(() => import('@/pages/CrmIntegrationPage').then((m) => ({ default: m.CrmIntegrationPage })))
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const CompliancePage = lazy(() => import('@/pages/CompliancePage').then((m) => ({ default: m.CompliancePage })))
const OpportunitiesPage = lazy(() => import('@/pages/OpportunitiesPage').then((m) => ({ default: m.OpportunitiesPage })))
const StudentProfilingPage = lazy(() => import('@/pages/StudentProfilingPage').then((m) => ({ default: m.StudentProfilingPage })))
const CommunicationPage = lazy(() => import('@/pages/CommunicationPage').then((m) => ({ default: m.CommunicationPage })))
const AiInsightsPage = lazy(() => import('@/pages/AiInsightsPage').then((m) => ({ default: m.AiInsightsPage })))
const EnrollmentPipelinePage = lazy(() => import('@/pages/EnrollmentPipelinePage').then((m) => ({ default: m.EnrollmentPipelinePage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))

/** Light-weight loading placeholder shown while a page chunk loads. */
function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading page">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
        <p className="text-sm font-medium text-slate-500">Loading…</p>
      </div>
    </div>
  )
}

export function AppRouter() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public routes (no app shell) */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Authenticated app shell */}
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          {/* Main */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/courses" element={<CoursesPage />} />

          {/* AI Intelligence */}
          <Route path="/ai/lead-scoring" element={<LeadScoringPage />} />
          <Route path="/ai/recommendations" element={<RecommendationsPage />} />
          <Route path="/ai/predictive-insights" element={<PredictiveInsightsPage />} />
          <Route path="/ai/assistant" element={<AssistantPage />} />

          {/* Sales & Engagement */}
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/follow-ups" element={<FollowUpsPage />} />
          <Route path="/call-intelligence" element={<CallIntelligencePage />} />
          <Route path="/meetings" element={<MeetingsPage />} />
          <Route path="/tasks" element={<TasksPage />} />

          {/* Analytics */}
          <Route path="/analytics" element={<Navigate to="/analytics/sales" replace />} />
          <Route path="/analytics/:tab" element={<AnalyticsPage />} />
          <Route path="/counselors" element={<CounselorsPage />} />

          {/* System */}
          <Route path="/crm-integration" element={<CrmIntegrationPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/compliance" element={<CompliancePage />} />

          {/* Secondary modules (reachable but not in the primary nav) */}
          <Route path="/opportunities" element={<OpportunitiesPage />} />
          <Route path="/student-profiling" element={<StudentProfilingPage />} />
          <Route path="/communication" element={<CommunicationPage />} />
          <Route path="/ai-insights" element={<AiInsightsPage />} />
          <Route path="/enrollment-pipeline" element={<EnrollmentPipelinePage />} />

          {/* Legacy route redirects */}
          <Route path="/lead-scoring" element={<Navigate to="/ai/lead-scoring" replace />} />
          <Route path="/recommendations" element={<Navigate to="/ai/recommendations" replace />} />
          <Route path="/predictive-insights" element={<Navigate to="/ai/predictive-insights" replace />} />
          <Route path="/assistant" element={<Navigate to="/ai/assistant" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
