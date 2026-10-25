/**
 * Typed contracts for the Member 2 ML/API integration.
 *
 * These shapes mirror the *expected* Member 2 backend contract (the paths and
 * payloads are defined centrally in `src/services/apiClient.ts`). They are
 * consumed only through that client — components never talk to the backend
 * directly. When Member 2's `main.py` lands, confirm the paths/fields against
 * it; nothing in the UI pretends the service is live until `/api/health`
 * actually responds.
 *
 * All fields are optional-safe: the UI renders only what the API returns and
 * never invents scores, risks or recommendations.
 */

/** Response of the service health check. */
export interface AiServiceHealth {
  status: 'ok' | string
  /** Optional list of loaded model names (informational). */
  models?: string[]
  message?: string
}

/* ------------------------------------------------------------------ */
/* Lead scoring — lead_scoring_model.pkl                              */
/* ------------------------------------------------------------------ */

export interface LeadScoreRequestItem {
  id: string
  platform?: string | null
  region?: string | null
  campaignType?: string | null
  leads?: number | null
  applications?: number | null
  enrollments?: number | null
}

export interface LeadScoreRequest {
  /** Batch of real lead records (a small, filtered subset — never the whole dataset). */
  leads: LeadScoreRequestItem[]
}

export interface LeadScoreResult {
  id: string
  /** 0–100 model score. */
  score: number
  /** Optional risk bucket — only rendered when returned by the API. */
  risk?: 'Low' | 'Medium' | 'High'
  /** Optional category/label — only rendered when returned by the API. */
  category?: string
}

export interface LeadScoreResponse {
  results: LeadScoreResult[]
  model?: string
}

/* ------------------------------------------------------------------ */
/* Course recommendation — course_recommendation_model_light.pkl      */
/* ------------------------------------------------------------------ */

export interface CourseRecommendationRequest {
  /** Real student profile fields (subset actually accepted by the model). */
  student: {
    id: string
    course?: string | null
    gender?: string | null
    age?: number | null
    admissionGrade?: number | null
    scholarship?: number | null
    attendance?: string | null
  }
  topK?: number
}

export interface CourseRecommendationResult {
  courseCode: string
  /** Confidence/probability/rank score — shown only when returned. */
  score: number
  rank: number
}

export interface CourseRecommendationResponse {
  recommendations: CourseRecommendationResult[]
  model?: string
}

/* ------------------------------------------------------------------ */
/* Dropout warning — dropout_warning_model.pkl                        */
/* ------------------------------------------------------------------ */

export interface DropoutPredictionRequestItem {
  id: string
  course?: string | null
  gender?: string | null
  age?: number | null
  admissionGrade?: number | null
  scholarship?: number | null
  attendance?: string | null
  maritalStatus?: string | null
}

export interface DropoutPredictionRequest {
  /** Batch of real student records (a small, filtered subset). */
  students: DropoutPredictionRequestItem[]
}

export interface DropoutPredictionResult {
  id: string
  /** 0–1 dropout probability. */
  probability: number
  /** Optional risk bucket — only rendered when returned by the API. */
  risk?: 'Low' | 'Medium' | 'High'
}

export interface DropoutPredictionResponse {
  results: DropoutPredictionResult[]
  model?: string
}

/* ------------------------------------------------------------------ */
/* Sales forecasting — sales_forecasting_model.pkl                    */
/* ------------------------------------------------------------------ */

export interface SalesForecastRequest {
  /** Real historical series used to fit the forecast (dates + leads/enrollments). */
  series: Array<{ date: string; leads: number; enrollments: number }>
  /** Number of future periods to forecast. */
  horizon?: number
}

export interface SalesForecastPoint {
  /** Period label (e.g. month or date). */
  period: string
  value: number
}

export interface SalesForecastResponse {
  /** Forecast points only — never mixed with actuals. */
  forecast: SalesForecastPoint[]
  model?: string
}

/* ------------------------------------------------------------------ */
/* Student profiling — student_profiling_vectorizer.pkl               */
/* ------------------------------------------------------------------ */

export interface StudentProfileRequest {
  /** Real student profile fields (subset actually accepted by the model). */
  student: {
    id: string
    course?: string | null
    gender?: string | null
    age?: number | null
    admissionGrade?: number | null
    scholarship?: number | null
    attendance?: string | null
    maritalStatus?: string | null
  }
}

export interface StudentProfileResponse {
  /** 0–100 profile/lead score — rendered only when returned. */
  score?: number
  /** Optional risk bucket — only rendered when returned by the API. */
  risk?: 'Low' | 'Medium' | 'High'
  /** Optional category — only rendered when returned by the API. */
  category?: string
  /** Optional next-action recommendation — only rendered when returned. */
  recommendedAction?: string
}

/* ------------------------------------------------------------------ */
/* Service status                                                     */
/* ------------------------------------------------------------------ */

export type AiServiceStatus = 'checking' | 'connected' | 'unavailable'
