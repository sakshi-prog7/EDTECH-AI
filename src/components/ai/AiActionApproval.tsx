import { useState } from 'react'
import { Check, Clock, Loader2, X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import type { BadgeVariant } from '@/components/common/Badge'
import { cn } from '@/utils/cn'

interface AiAction {
  id: string
  action: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  confidence?: number
  suggestedTiming?: string
  relatedEntity?: {
    type: string
    id: string
    name: string
  }
}

interface AiActionApprovalProps {
  actions: AiAction[]
  onApprove: (actionId: string) => Promise<void>
  onDismiss: (actionId: string) => void
  onCreateTask?: (action: AiAction) => void
  className?: string
}

const priorityVariants: Record<string, BadgeVariant> = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
}

/**
 * AI Action Approval flow component.
 * Displays recommended actions and allows users to approve, dismiss, or create tasks.
 */
export function AiActionApproval({ 
  actions, 
  onApprove, 
  onDismiss, 
  onCreateTask,
  className 
}: AiActionApprovalProps) {
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  const handleApprove = async (actionId: string) => {
    setApprovingId(actionId)
    try {
      await onApprove(actionId)
    } finally {
      setApprovingId(null)
    }
  }

  const handleDismiss = (actionId: string) => {
    setDismissedIds(prev => new Set([...prev, actionId]))
    onDismiss(actionId)
  }

  const visibleActions = actions.filter(a => !dismissedIds.has(a.id))

  if (visibleActions.length === 0) {
    return (
      <Card className={cn('p-6 text-center', className)}>
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <Check className="h-5 w-5" />
          </div>
          <p className="text-[13px] font-medium text-slate-900 dark:text-white">
            All actions reviewed
          </p>
          <p className="text-[12px] text-slate-500 dark:text-slate-400">
            No pending AI recommendations to review.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-[14px] font-semibold text-slate-900 dark:text-white">
        Recommended Actions
      </h3>
      
      {visibleActions.map((action) => (
        <Card key={action.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant={priorityVariants[action.priority]}>
                  {action.priority}
                </Badge>
                {action.confidence !== undefined && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {Math.round(action.confidence * 100)}% confidence
                  </span>
                )}
              </div>
              
              <p className="mt-2 text-[13px] font-medium text-slate-900 dark:text-white">
                {action.action}
              </p>
              
              {action.description && (
                <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">
                  {action.description}
                </p>
              )}
              
              {action.suggestedTiming && (
                <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <Clock className="h-3 w-3" />
                  {action.suggestedTiming}
                </div>
              )}
              
              {action.relatedEntity && (
                <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Related: {action.relatedEntity.type} — {action.relatedEntity.name}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {onCreateTask && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onCreateTask(action)}
                >
                  Create Task
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDismiss(action.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleApprove(action.id)}
                disabled={approvingId === action.id}
              >
                {approvingId === action.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                {approvingId === action.id ? 'Processing…' : 'Approve'}
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

interface AiActionBannerProps {
  action: string
  priority: string
  onApprove: () => void
  onDismiss: () => void
  className?: string
}

/**
 * Simple AI action banner for inline recommendations.
 */
export function AiActionBanner({ action, priority, onApprove, onDismiss, className }: AiActionBannerProps) {
  return (
    <div className={cn(
      'flex items-center justify-between gap-3 rounded-xl border p-3',
      priority === 'high' || priority === 'critical'
        ? 'border-amber-200 bg-amber-50/60 dark:border-amber-400/25 dark:bg-amber-500/[0.06]'
        : 'border-indigo-200 bg-indigo-50/60 dark:border-indigo-400/25 dark:bg-indigo-500/[0.06]',
      className
    )}>
      <div className="flex items-center gap-2">
        <AlertTriangle className={cn(
          'h-4 w-4',
          priority === 'high' || priority === 'critical'
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-indigo-600 dark:text-indigo-400'
        )} />
        <span className="text-[13px] font-medium text-slate-900 dark:text-white">
          {action}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
        <Button variant="primary" size="sm" onClick={onApprove}>
          <Check className="h-3.5 w-3.5" />
          Approve
        </Button>
      </div>
    </div>
  )
}