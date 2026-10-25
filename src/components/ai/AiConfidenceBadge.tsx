import { Sparkles } from 'lucide-react'
import { cn } from '@/utils/cn'

interface AiConfidenceBadgeProps {
  confidence: number // 0.0 - 1.0
  provider?: string
  model?: string
  showLabel?: boolean
  className?: string
}

/**
 * Standardized AI confidence display component.
 * Shows confidence level with provider/model info when available.
 */
export function AiConfidenceBadge({ 
  confidence, 
  provider = 'baseline', 
  model,
  showLabel = true,
  className 
}: AiConfidenceBadgeProps) {
  const percentage = Math.round(confidence * 100)
  const level = confidence >= 0.8 ? 'high' : confidence >= 0.6 ? 'medium' : 'low'
  
  const levelStyles = {
    high: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-400/25',
    medium: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-400/25',
    low: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10',
  }

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        levelStyles[level]
      )}>
        <Sparkles className="h-3 w-3" />
        {showLabel && <span>Confidence:</span>}
        <span className="tabular-nums">{percentage}%</span>
      </span>
      
      {provider && (
        <span className="text-[10px] text-slate-500 dark:text-slate-400">
          {provider}{model ? ` · ${model}` : ''}
        </span>
      )}
    </div>
  )
}

interface AiModelInfoProps {
  provider: string
  model?: string
  fallback?: boolean
  className?: string
}

/**
 * Displays AI model information with provider status.
 */
export function AiModelInfo({ provider, model, fallback = false, className }: AiModelInfoProps) {
  return (
    <div className={cn('flex items-center gap-1.5 text-[11px]', className)}>
      <span className={cn(
        'inline-flex h-1.5 w-1.5 rounded-full',
        fallback ? 'bg-amber-500' : 'bg-emerald-500'
      )} />
      <span className="font-medium text-slate-600 dark:text-slate-400">
        {provider === 'openai' ? 'OpenAI' : 'Baseline'}
      </span>
      {model && (
        <span className="text-slate-500 dark:text-slate-500">
          · {model}
        </span>
      )}
      {fallback && (
        <span className="text-amber-600 dark:text-amber-400">
          (fallback)
        </span>
      )}
    </div>
  )
}