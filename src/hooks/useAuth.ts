import { useState, useCallback } from 'preact/hooks'
import { storage } from '../lib/storageContext'

interface AuthState {
  currentUser: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ currentUser: null })

  const login = useCallback(async (username: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    const trimmed = username.trim().toLowerCase()
    if (!trimmed) {
      return { success: false, error: 'Skriv ett användarnamn!' }
    }
    if (!/^\d{4}$/.test(pin)) {
      return { success: false, error: 'Koden måste vara 4 siffror!' }
    }

    const existing = await storage.getUser(trimmed)
    if (!existing) {
      await storage.createUser(trimmed, pin)
    } else {
      const valid = await storage.validatePin(trimmed, pin)
      if (!valid) {
        return { success: false, error: 'Fel kod! Försök igen 🔒' }
      }
    }

    setState({ currentUser: trimmed })
    return { success: true }
  }, [])

  const logout = useCallback(() => {
    setState({ currentUser: null })
  }, [])

  return {
    currentUser: state.currentUser,
    login,
    logout,
  }
}
