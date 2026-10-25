import { AiAssistant } from '@/components/ai/AiAssistant'
import { cn } from '@/utils/cn'

interface AiAssistantPanelProps {
  open: boolean
  onClose: () => void
}

export function AiAssistantPanel({ open, onClose }: AiAssistantPanelProps) {
  return (
    <div
      className={cn('fixed inset-0 z-[60]', !open && 'pointer-events-none')}
      inert={!open}
      aria-hidden={!open}
    >
      <div
        className={cn(
          'absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          'absolute inset-y-0 right-0 w-full max-w-md transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <AiAssistant
          onClose={onClose}
          className="h-full rounded-l-xl border-l border-slate-200 shadow-2xl dark:border-slate-800"
        />
      </div>
    </div>
  )
}
