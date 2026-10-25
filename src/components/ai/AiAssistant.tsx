import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Bot, RefreshCw, Send, X } from 'lucide-react'

import { IconButton } from '@/components/common/IconButton'
import { apiRequest } from '@/services/authApi'
import { cn } from '@/utils/cn'
import { answerAssistantQuery } from '@/services/localAiEngine'
import { localLeads, localStudents, localCourses } from '@/services/localStore'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
}

interface AiAssistantProps {
  /** When provided, a close button is rendered (slide-over usage). */
  onClose?: () => void
  /** Controls the outer size; callers supply height/rounding/border. */
  className?: string
}

const SUGGESTIONS = [
  'What should I focus on today?',
  'Which students are at risk?',
  'Which leads need follow-up?',
  'Which leads are most likely to convert?',
  'Show me today\'s priorities.',
  'How many leads are there?',
  'What is our conversion rate?',
  'Which campaign performs best?',
]

const WELCOME =
  "Hi, I'm EDTECH AI 👋 I answer from your live data — leads, courses, enrollments, campaigns and the AI features. Try one of the questions below."

interface ApiReply {
  reply: string
  matchedIntent: string | null
}

export function AiAssistant({ onClose, className }: AiAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: 'assistant', content: WELCOME },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  // The last user message that failed to reach the backend, so the user can
  // retry it without retyping.
  const [failedText, setFailedText] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(1)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, isTyping])

  const getLocalReply = (text: string): string => {
    const leads = localLeads.list()
    const students = localStudents.list()
    const courses = localCourses.list()
    return answerAssistantQuery(text, leads, students, courses)
  }

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isTyping) return
    setMessages((prev) => [...prev, { id: nextId.current++, role: 'user', content: trimmed }])
    setInput('')
    setFailedText(null)
    setIsTyping(true)
    try {
      // Try the backend first
      const reply = await apiRequest<ApiReply>('/api/assistant/message', {
        method: 'POST',
        body: { message: trimmed },
      })
      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, role: 'assistant', content: reply.reply },
      ])
    } catch {
      // Backend unavailable — use local AI engine with local data
      const localReply = getLocalReply(trimmed)
      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, role: 'assistant', content: localReply },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void send(input)
  }

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden bg-white dark:bg-slate-900',
        className,
      )}
    >
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 shadow-sm shadow-indigo-600/30">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[14px] font-semibold text-slate-900 dark:text-white">
            EDTECH AI Assistant
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Answers from your live data
          </p>
        </div>
        {onClose && (
          <IconButton label="Close assistant" onClick={onClose}>
            <X className="h-5 w-5" />
          </IconButton>
        )}
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((message) =>
          message.role === 'user' ? (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-indigo-600 px-3.5 py-2.5 text-[13px] leading-relaxed text-white shadow-sm">
                {message.content}
              </div>
            </div>
          ) : (
            <div key={message.id} className="flex items-end gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-bl-md bg-slate-100 px-3.5 py-2.5 text-[13px] leading-relaxed text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                {message.content}
              </div>
            </div>
          ),
        )}

        {isTyping && (
          <div className="flex items-end gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 dark:bg-slate-800">
              <span className="flex gap-1" aria-label="Assistant is typing">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}

        {failedText && !isTyping && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void send(failedText)}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[12px] font-semibold text-rose-700 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/60 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry last message
            </button>
          </div>
        )}
      </div>

      {/* Suggestions (before the conversation starts) */}
      {messages.length <= 1 && (
        <div className="shrink-0 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Try asking
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void send(suggestion)}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11.5px] text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 items-center gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800"
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask EDTECH AI…"
          aria-label="Ask EDTECH AI"
          className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13px] text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:bg-slate-800"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={!input.trim() || isTyping}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 disabled:pointer-events-none disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
