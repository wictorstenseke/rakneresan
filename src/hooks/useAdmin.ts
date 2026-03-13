import { useState, useEffect, useCallback } from 'preact/hooks'
import { adminStorage } from '../lib/storageContext'
import type { SpaceUser, SpaceConfig } from '../lib/storage'

export function useAdmin() {
  const [users, setUsers] = useState<SpaceUser[]>([])
  const [spaceConfig, setSpaceConfig] = useState<SpaceConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [fetchedUsers, fetchedConfig] = await Promise.all([
        adminStorage.listSpaceUsers(),
        adminStorage.getSpaceConfig(),
      ])
      setUsers(fetchedUsers)
      setSpaceConfig(fetchedConfig)
    } catch (err) {
      setError('Kunde inte ladda data. Försök igen.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addUser = useCallback(async (username: string, pin: string) => {
    await adminStorage.createSpaceUser(username, pin)
    await refresh()
  }, [refresh])

  const addAdmin = useCallback(async (username: string, pin: string) => {
    await adminStorage.createAdmin(username, pin)
    await refresh()
  }, [refresh])

  const updateActiveCategories = useCallback(async (ids: number[] | null) => {
    await adminStorage.updateSpaceConfig({ activeCategories: ids })
    await adminStorage.propagateSpaceConfig({ activeCategories: ids })
    setSpaceConfig(c => c ? { ...c, activeCategories: ids } : c)
  }, [])

  const toggleCredits = useCallback(async (enabled: boolean) => {
    await adminStorage.updateSpaceConfig({ creditsEnabled: enabled })
    await adminStorage.propagateSpaceConfig({ creditsEnabled: enabled })
    setSpaceConfig(c => c ? { ...c, creditsEnabled: enabled } : c)
  }, [])

  const addVideo = useCallback(async (categoryId: string, url: string) => {
    const current = spaceConfig?.videos ?? {}
    const existing = current[categoryId] ?? []
    if (existing.includes(url)) return
    const updated = { ...current, [categoryId]: [...existing, url] }
    await adminStorage.updateSpaceConfig({ videos: updated })
    await adminStorage.propagateSpaceConfig({ spaceVideos: updated })
    setSpaceConfig(c => c ? { ...c, videos: updated } : c)
  }, [spaceConfig])

  const removeVideo = useCallback(async (categoryId: string, url: string) => {
    const current = spaceConfig?.videos ?? {}
    const updated = { ...current, [categoryId]: (current[categoryId] ?? []).filter(u => u !== url) }
    await adminStorage.updateSpaceConfig({ videos: updated })
    await adminStorage.propagateSpaceConfig({ spaceVideos: updated })
    setSpaceConfig(c => c ? { ...c, videos: updated } : c)
  }, [spaceConfig])

  const toggleVideoHidden = useCallback(async (id: string) => {
    const current = spaceConfig?.hiddenVideos ?? []
    const updated = current.includes(id) ? current.filter(v => v !== id) : [...current, id]
    setSpaceConfig(c => c ? { ...c, hiddenVideos: updated } : c)
    await adminStorage.updateSpaceConfig({ hiddenVideos: updated })
    await adminStorage.propagateSpaceConfig({ hiddenVideos: updated })
  }, [spaceConfig])

  return {
    users,
    spaceConfig,
    loading,
    error,
    refresh,
    addUser,
    addAdmin,
    updateActiveCategories,
    toggleCredits,
    addVideo,
    removeVideo,
    toggleVideoHidden,
  }
}
