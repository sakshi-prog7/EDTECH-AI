import { AiAssistant } from '@/components/ai/AiAssistant'
import { PageHeader } from '@/components/common/PageHeader'

export function AssistantPage() {
  return (
    <>
      <PageHeader
        eyebrow="EDTECH AI • Learning Assistant"
        title="AI Sales Assistant"
        description="Ask the EDTECH AI assistant about leads, courses, enrollments and performance — answers are generated from your live data."
      />
      <AiAssistant className="h-[calc(100vh-15rem)] min-h-[420px] rounded-xl border border-slate-200 shadow-sm dark:border-slate-800" />
    </>
  )
}
