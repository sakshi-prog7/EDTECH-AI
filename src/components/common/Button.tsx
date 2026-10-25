import type { ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

import { cn } from '@/utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Shows a spinner and disables the button. */
  loading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#8B5CF6] text-white shadow-[0_8px_20px_rgba(124,58,237,0.22)] transition-[transform,box-shadow,background-color] duration-[180ms] ease-out hover:-translate-y-px hover:from-[#5B21B6] hover:via-[#6D28D9] hover:to-[#7C3AED] hover:shadow-[0_10px_26px_rgba(124,58,237,0.32)] active:translate-y-0 active:bg-indigo-700 focus-visible:ring-indigo-500/60',
  secondary:
    'border border-[#DDD6FE] bg-white text-[#4C4663] shadow-sm transition-[transform,box-shadow,background-color,border-color] duration-[180ms] ease-out hover:-translate-y-px hover:border-[#C4B5FD] hover:bg-[#F7F4FF] hover:text-[#6D28D9] hover:shadow-md active:translate-y-0 active:bg-slate-50 focus-visible:ring-slate-400/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:border-indigo-400/40 dark:hover:text-slate-100 dark:active:bg-white/[0.03]',
  outline:
    'border-2 border-indigo-200 bg-transparent text-indigo-700 transition-[transform,box-shadow,background-color,border-color] duration-[180ms] ease-out hover:-translate-y-px hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-sm active:translate-y-0 active:bg-indigo-100 focus-visible:ring-indigo-500/60 dark:border-indigo-400/30 dark:text-indigo-300 dark:hover:border-indigo-400/60 dark:hover:bg-indigo-500/10 dark:active:bg-indigo-500/20',
  ghost:
    'text-slate-600 transition-[background-color,color] duration-[180ms] ease-out hover:bg-indigo-50/70 hover:text-indigo-700 active:bg-indigo-100 focus-visible:ring-slate-400/40 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white dark:active:bg-white/10',
  danger:
    'bg-rose-600 text-white shadow-xs transition-[transform,box-shadow,background-color] duration-[180ms] ease-out hover:-translate-y-px hover:bg-rose-500 hover:shadow-md hover:shadow-rose-500/25 active:translate-y-0 active:bg-rose-700 focus-visible:ring-rose-500/60',
  success:
    'bg-emerald-600 text-white shadow-xs transition-[transform,box-shadow,background-color] duration-[180ms] ease-out hover:-translate-y-px hover:bg-emerald-500 hover:shadow-md hover:shadow-emerald-500/25 active:translate-y-0 active:bg-emerald-700 focus-visible:ring-emerald-500/60',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2.5 px-5 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  type = 'button',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        loading && 'cursor-wait',
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}
