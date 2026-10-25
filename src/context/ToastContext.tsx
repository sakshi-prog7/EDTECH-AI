/**
 * Global toast notification context.
 *
 * Provides `showToast()` to any component in the tree. Toasts auto-dismiss
 * after 3.5 seconds and can be manually dismissed.
 */
import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'

import { Toast, type ToastKind, type ToastState } from '@/components/ui/Toast'

interface ToastContextValue {
  showToast: (kind: ToastKind, message: string) => void
  showSuccess: (message: string) => void
  showError: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)

  const showToast = useCallback((kind: ToastKind, message: string) => {
    setToast({ kind, message })
  }, [])

  const showSuccess = useCallback((message: string) => showToast('success', message), [showToast])
  const showError = useCallback((message: string) => showToast('error', message), [showToast])

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError }}>
      {children}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
