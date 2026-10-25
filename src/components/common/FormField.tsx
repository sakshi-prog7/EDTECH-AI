import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { AlertCircle } from 'lucide-react'

import { cn } from '@/utils/cn'

export const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-900 shadow-xs outline-none transition-colors placeholder:text-slate-500 hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-indigo-400/60 dark:focus:border-indigo-400 dark:focus:bg-white/10'

export const selectClass = cn(inputClass, 'cursor-pointer appearance-none pr-8')

interface FieldWrapProps {
  id: string
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
}

export function Field({ id, label, hint, error, required, children }: FieldWrapProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">
        {label}
        {required && <span className="ml-0.5 text-rose-500" aria-hidden="true">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[11.5px] text-slate-500 dark:text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  hint?: string
  error?: string
}

export function TextInput({ id, label, hint, error, required, className, ...rest }: TextInputProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required}>
      <input id={id} className={cn(inputClass, error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/25', className)} {...rest} />
    </Field>
  )
}

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string
  label: string
  hint?: string
  error?: string
  options: Array<{ value: string; label: string }>
}

export function SelectInput({ id, label, hint, error, required, options, className, ...rest }: SelectInputProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required}>
      <div className="relative">
        <select id={id} className={cn(selectClass, error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/25', className)} {...rest}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </Field>
  )
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string
  label: string
  hint?: string
  error?: string
}

export function TextArea({ id, label, hint, error, required, className, ...rest }: TextAreaProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required}>
      <textarea id={id} className={cn(inputClass, 'h-auto min-h-[84px] resize-y py-2', error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/25', className)} {...rest} />
    </Field>
  )
}
