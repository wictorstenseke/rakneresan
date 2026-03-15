import { useState, useEffect, useCallback } from 'preact/hooks'
import { adminStorage, clearUserCache } from '../lib/storageContext'
import type { SpaceUser, SpaceConfig } from '../lib/storage'

interface AdminCache {
  users: SpaceUser[]
  spaceConfig: SpaceConfig | null
}
let _adminCache: AdminCache | null = null

export function useAdmin() {
  const [users, setUsers] = useState<SpaceUser[]>([])
  const [spaceConfig, setSpaceConfig] = useState<SpaceConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const [fetchedUsers, fetchedConfig] = await Promise.all([
        adminStorage.listSpaceUsers(),
        adminStorage.getSpaceConfig(),
      ])
      _adminCache = { users: fetchedUsers, spaceConfig: fetchedConfig }
      setUsers(fetchedUsers)
      setSpaceConfig(fetchedConfig)
      // Superuser's own users doc was synced in getSpaceConfig — clear
      // the storage cache so ShopPage reads fresh data on next visit
      clearUserCache()
    } catch (err) {
      if (!silent) setError('Kunde inte ladda data. Försök igen.')
      console.error(err)
    } finally {
      if (!silent) setLoading(false)
      else setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (_adminCache) {
      // Return visit — show cached data immediately, fetch latest in background
      setUsers(_adminCache.users)
      setSpaceConfig(_adminCache.spaceConfig)
      setLoading(false)
      void refresh(true)
    } else {
      // First visit — fetch with loading spinner
      void refresh()
    }
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
    refreshing,
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
