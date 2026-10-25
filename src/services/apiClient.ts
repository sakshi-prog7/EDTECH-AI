/**
 * Centralized client for the AI/ML prediction endpoints.
 *
 * All AI prediction calls go through this module. The base URL uses the
 * same `VITE_API_URL` as the main `authApi` client for consistency.
 *
 * Error handling: timeouts, network failures and HTTP errors are normalized
 * into short user-safe messages. Stack traces / raw fetch errors are never
 * surfaced to the UI.
 */
import { API_BASE_URL, getAccessToken } from '@/services/authApi'
import type {
  AiServiceHealth,
  CourseRecommendationRequest,
  CourseRecommendationResponse,
  DropoutPredictionRequest,
  DropoutPredictionResponse,
  LeadScoreRequest,
  LeadScoreResponse,
  SalesForecastRequest,
  SalesForecastResponse,
  StudentProfileRequest,
  StudentProfileResponse,
} from '@/types/ai'

/** AI endpoint paths served by the backend. */
export const AI_ENDPOINTS = {
  health: '/api/health',
  leadScore: '/api/predict/lead-score',
  recommendCourses: '/api/recommend/courses',
  dropoutPrediction: '/api/predict/dropout',
  salesForecast: '/api/forecast/sales',
  studentProfile: '/api/profile/student',
} as const

/** Base URL used by all AI requests — re-exported for the AI status card. */
export function getAiApiBaseUrl(): string {
  return API_BASE_URL
}

const DEFAULT_TIMEOUT_MS = 8000

export class AiApiError extends Error {
  readonly status: number | null
  readonly code: 'timeout' | 'network' | 'http' | 'invalid'

  constructor(message: string, code: AiApiError['code'], status: number | null = null) {
    super(message)
    this.name = 'AiApiError'
    this.code = code
    this.status = status
  }
}

/** Map an HTTP status to a short, user-safe message (no stack traces). */
function messageForStatus(status: number): string {
  if (status === 400) return 'The AI service rejected the request (HTTP 400).'
  if (status === 401) return 'The AI service requires authentication (HTTP 401).'
  if (status === 404) return 'The AI endpoint was not found (HTTP 404).'
  if (status === 422) return 'The AI service could not process the payload (HTTP 422).'
  if (status >= 500) return 'The AI service encountered an error (HTTP 500).'
  return `The AI service returned an unexpected response (HTTP ${status}).`
}

/**
 * Core request helper: JSON in/out, AbortController timeout, normalized
 * errors. Throws `AiApiError` on any failure — callers surface the message.
 * Sends the access token when available for authenticated AI endpoints.
 */
async function aiRequest<T>(
  path: string,
  init: { method?: string; body?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  const { method = 'GET', body, timeoutMs = DEFAULT_TIMEOUT_MS } = init
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  const token = getAccessToken()

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AiApiError(
        'The AI service did not respond in time. It may be starting up — try again.',
        'timeout',
      )
    }
    throw new AiApiError(
      'AI service is currently unavailable. Check that the backend is running.',
      'network',
    )
  } finally {
    window.clearTimeout(timer)
  }

  if (!response.ok) {
    throw new AiApiError(messageForStatus(response.status), 'http', response.status)
  }

  const text = await response.text()
  if (!text) {
    throw new AiApiError('The AI service returned an empty response.', 'invalid')
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new AiApiError('The AI service returned an unreadable response.', 'invalid')
  }
}

/** Health check — used to decide whether any AI surface may call the models. */
export function checkAiService(timeoutMs = 4000): Promise<AiServiceHealth> {
  return aiRequest<AiServiceHealth>(AI_ENDPOINTS.health, { timeoutMs })
}

/** Batch lead scoring (one request for many records — no per-lead calls). */
export function predictLeadScores(payload: LeadScoreRequest): Promise<LeadScoreResponse> {
  return aiRequest<LeadScoreResponse>(AI_ENDPOINTS.leadScore, {
    method: 'POST',
    body: payload,
  })
}

/** Course recommendations for one real student profile. */
export function recommendCourses(payload: CourseRecommendationRequest): Promise<CourseRecommendationResponse> {
  return aiRequest<CourseRecommendationResponse>(AI_ENDPOINTS.recommendCourses, {
    method: 'POST',
    body: payload,
  })
}

/** Batch dropout-risk prediction. */
export function predictDropoutRisk(payload: DropoutPredictionRequest): Promise<DropoutPredictionResponse> {
  return aiRequest<DropoutPredictionResponse>(AI_ENDPOINTS.dropoutPrediction, {
    method: 'POST',
    body: payload,
  })
}

/** Sales forecast from real historical series. */
export function generateSalesForecast(payload: SalesForecastRequest): Promise<SalesForecastResponse> {
  return aiRequest<SalesForecastResponse>(AI_ENDPOINTS.salesForecast, {
    method: 'POST',
    body: payload,
  })
}

/** Student profile analysis (vectorizer-backed when Member 2 exposes it). */
export function profileStudent(payload: StudentProfileRequest): Promise<StudentProfileResponse> {
  return aiRequest<StudentProfileResponse>(AI_ENDPOINTS.studentProfile, {
    method: 'POST',
    body: payload,
  })
}
