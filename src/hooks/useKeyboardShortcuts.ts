/**
 * Global keyboard shortcuts.
 *
 * - Cmd+K / Ctrl+K → open global search
 * - Escape → close any open modal
 * - Cmd+/ → open AI assistant
 */
import { useEffect } from 'react'

interface KeyboardShortcutsOptions {
  onOpenSearch: () => void
  onCloseSearch: () => void
  searchOpen: boolean
}

export function useKeyboardShortcuts({ onOpenSearch, onCloseSearch, searchOpen }: KeyboardShortcutsOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K → global search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (searchOpen) {
          onCloseSearch()
        } else {
          onOpenSearch()
        }
      }

      // Escape → close search
      if (e.key === 'Escape' && searchOpen) {
        onCloseSearch()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onOpenSearch, onCloseSearch, searchOpen])
}
