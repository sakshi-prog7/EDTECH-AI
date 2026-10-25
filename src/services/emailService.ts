/**
 * Email Service Abstraction for EDTECH AI
 *
 * Uses environment variables for email provider credentials.
 * Supports configurable email providers through environment variables.
 *
 * Required environment variables:
 *   VITE_EMAIL_PROVIDER  - 'smtp' | 'console' (default: 'console')
 *   VITE_EMAIL_FROM      - Sender email address
 *   VITE_EMAIL_API_KEY   - API key for the email provider (if using a service)
 *
 * When no email provider is configured:
 *   - Emails are logged to console (development mode)
 *   - The UI shows "Email provider not configured"
 *
 * When email provider is configured:
 *   - Emails are sent via the configured provider
 *   - Success/failure messages are shown
 */

import { API_BASE_URL, getAccessToken } from './authApi'

export interface EmailSendResult {
  success: boolean
  message: string
  mode: 'sent' | 'dev' | 'error'
  to?: string
  subject?: string
  error?: string
}

export interface EmailConfig {
  provider: string
  configured: boolean
  fromEmail: string | null
  host: string | null
}

/**
 * Get the email provider configuration from the backend.
 */
export async function getEmailConfig(): Promise<EmailConfig> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/email/config`, {
      headers: {
        'Content-Type': 'application/json',
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
    })
    if (response.ok) {
      const data = await response.json()
      return {
        provider: data.data?.mode || 'console',
        configured: data.data?.configured || false,
        fromEmail: data.data?.fromEmail || null,
        host: data.data?.host || null,
      }
    }
  } catch {
    // Backend not available
  }
  return {
    provider: 'console',
    configured: false,
    fromEmail: null,
    host: null,
  }
}

/**
 * Send an email through the configured provider.
 * Falls back to console logging if provider is not configured.
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
): Promise<EmailSendResult> {
  const config = await getEmailConfig()

  if (!config.configured) {
    // Development mode - log to console
    console.log('📧 [DEV MODE] Email would be sent:', {
      to,
      subject,
      body: htmlBody.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
      from: config.fromEmail || 'noreply@edtech.ai',
      timestamp: new Date().toISOString(),
    })
    return {
      success: true,
      message: `Email generated successfully. SMTP is not configured, so the email was logged in development mode.`,
      mode: 'dev',
      to,
      subject,
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
      body: JSON.stringify({ to, subject, htmlBody }),
    })

    const data = await response.json()

    if (response.ok && data.success !== false) {
      return {
        success: true,
        message: `Email sent successfully to ${to}.`,
        mode: 'sent',
        to,
        subject,
      }
    } else {
      return {
        success: false,
        message: data.message || 'Failed to send email.',
        mode: 'error',
        to,
        subject,
        error: data.message || 'Unknown error',
      }
    }
  } catch (error) {
    return {
      success: false,
      message: 'Failed to send email. Check email configuration.',
      mode: 'error',
      to,
      subject,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

/**
 * Generate a personalized email using AI.
 */
export async function generateEmail(
  leadName: string,
  courseInterest: string,
  tone: string,
  leadScore?: number | null,
  leadStatus?: string,
  leadSource?: string,
  notes?: string,
): Promise<{ subject: string; body: string } | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/email-generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
      body: JSON.stringify({
        leadName,
        courseInterest,
        tone,
        leadScore,
        leadStatus,
        leadSource,
        notes,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return {
        subject: data.data?.subject || `Following up on your ${courseInterest} interest`,
        body: data.data?.body || '',
      }
    }
  } catch {
    // AI service not available
  }
  return null
}

/**
 * Preview an email template with sample data.
 */
export async function previewEmailTemplate(
  template: string,
  name: string,
): Promise<{ subject: string; html: string } | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/email/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
      body: JSON.stringify({ template, name }),
    })

    if (response.ok) {
      const data = await response.json()
      return {
        subject: data.data?.subject || '',
        html: data.data?.html || '',
      }
    }
  } catch {
    // Template preview not available
  }
  return null
}
