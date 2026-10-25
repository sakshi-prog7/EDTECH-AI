import type { LucideIcon } from 'lucide-react'

export type UserRole = 'ADMIN' | 'COUNSELOR' | 'ADMISSIONS' | 'STUDENT'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Optional count shown as a pill, e.g. pending follow-ups. */
  badge?: string
  /** If set, only users with one of these roles see this item. Empty = all roles. */
  roles?: UserRole[]
}

export interface NavSection {
  label: string
  items: NavItem[]
  /** If set, only shown to users with one of these roles. */
  roles?: UserRole[]
}
