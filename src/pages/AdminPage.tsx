import { useState, useCallback } from 'preact/hooks'
import { useAdmin } from '../hooks/useAdmin'
import { TopHeader } from '../components/TopHeader'
import { UserMenuChip } from '../components/UserMenuChip'
import { PinCell } from '../components/admin/PinCell'
import { KategoriTab } from '../components/admin/KategoriTab'
import { VideoTab } from '../components/admin/VideoTab'
import { InstallningarTab } from '../components/admin/InstallningarTab'
import { StatistikTab } from '../components/admin/StatistikTab'
import type { SpaceUser } from '../lib/storage'

interface AdminPageProps {
  role: 'admin' | 'superuser'
  user: string
  onLogout: () => void
  onBack?: () => void
  onStats?: () => void
  onShop?: () => void
}

type Tab = 'users' | 'kategorier' | 'videos' | 'installningar' | 'statistik'

function UserTab({
  label,
  addLabel,
  emptyLabel,
  users,
  onAdd,
}: {
  label: string
  addLabel: string
  emptyLabel: string
  users: SpaceUser[]
  onAdd: (u: string, p: string) => Promise<void>
}) {
  const [showForm, setShowForm] = useState(false)
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleAdd = useCallback(async () => {
    const trimmed = username.trim().toLowerCase()
    if (!trimmed) { setFormError('Skriv ett användarnamn'); return }
    if (!/^\d{4}$/.test(pin)) { setFormError('Koden måste vara 4 siffror'); return }
    setSubmitting(true)
    setFormError(null)
    try {
      await onAdd(trimmed, pin)
      setUsername('')
      setPin('')
      setShowForm(false)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/email-already-in-use') {
        setFormError('Det användarnamnet är redan taget.')
      } else {
        setFormError('Något gick fel. Försök igen.')
      }
    } finally {
      setSubmitting(false)
    }
  }, [username, pin, onAdd])

  return (
    <div class="flex flex-col gap-3">
      <div class="flex justify-between items-center">
        <h2 class="text-sm font-bold text-(--text-muted) uppercase tracking-wider">{label} <span class="font-normal">({users.length})</span></h2>
        <button
          type="button"
          onClick={() => setShowForm(s => !s)}
          class={showForm ? 'btn-add-user btn-add-user-cancel' : 'btn-add-user'}
        >
          {showForm ? '✕ Avbryt' : `+ ${addLabel}`}
        </button>
      </div>

      {showForm && (
        <div class="bg-(--surface) rounded-2xl p-4 flex flex-col gap-3 border border-(--border)">
          <input
            type="text"
            placeholder="Användarnamn"
            value={username}
            onInput={e => setUsername((e.target as HTMLInputElement).value)}
            class="border border-(--border) rounded-xl px-3 py-2 bg-(--bg) text-(--text) text-base"
            autoCapitalize="none"
            autoCorrect="off"
          />
          <input
            type="text"
            inputMode="numeric"
            placeholder="4-siffrig PIN"
            maxLength={4}
            value={pin}
            onInput={e => setPin((e.target as HTMLInputElement).value)}
            class="border border-(--border) rounded-xl px-3 py-2 bg-(--bg) text-(--text) text-base"
          />
          {formError && <p class="text-red-500 text-sm">{formError}</p>}
          <button
            type="button"
            onClick={handleAdd}
            disabled={submitting}
            class="back-chip w-full justify-center py-2.5 font-bold"
            style="border-color: var(--tc); color: var(--tc);"
          >
            {submitting ? 'Sparar...' : 'Skapa'}
          </button>
        </div>
      )}

      <div class="flex flex-col gap-1.5">
        {users.length === 0 && (
          <p class="text-(--text-muted) text-sm text-center py-6">{emptyLabel}</p>
        )}
        {users.map(u => (
          <div
            key={u.uid}
            class="bg-(--surface) rounded-xl px-4 py-3 flex items-center justify-between border border-(--border)"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span class="font-semibold text-(--text) truncate">{u.username}</span>
              {u.gameData ? (
                <span class="text-xs text-(--text-muted) shrink-0">
                  {Object.values(u.gameData.tables).reduce((s, t) => s + t.wins, 0)} vinster
                </span>
              ) : (
                <span class="text-xs text-(--text-muted) shrink-0">
                  Skapad {new Date(u.profile.createdAt).toLocaleDateString('sv-SE')}
                </span>
              )}
            </div>
            <PinCell pin={u.profile.pin} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminPage({ role, user, onLogout, onBack, onStats, onShop }: AdminPageProps) {
  const { users, spaceConfig, loading, error, addUser, addAdmin, updateActiveCategories, toggleCredits, addVideo, removeVideo, toggleVideoHidden } = useAdmin()
  const [tab, setTab] = useState<Tab>('users')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'users', label: 'Användare' },
    { id: 'kategorier', label: 'Kategorier' },
    { id: 'videos', label: 'Videos' },
    { id: 'installningar', label: 'Inställningar' },
    { id: 'statistik', label: 'Statistik' },
  ]

  return (
    <div
      class="min-h-dvh flex flex-col relative z-[1]"
      style="padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom);"
    >
      {/* Header */}
      <div class="px-4 pt-4 pb-2">
        <div class="max-w-2xl mx-auto w-full">
          <TopHeader showBack onBack={onBack ?? (() => {})} maxWidth="100%">
            <UserMenuChip
              user={user}
              onHome={onBack}
              onStats={onStats}
              onShop={onShop}
              onLogout={onLogout}
              variant={role === 'superuser' ? 'superuser' : 'admin'}
              onSuperuser={() => {}}
            />
          </TopHeader>
        </div>
      </div>

      {/* Tab bar */}
      <div class="px-4 py-2 shrink-0 max-sm:portrait:-mx-4">
        <div class="max-w-2xl mx-auto w-full min-w-0 flex flex-wrap gap-1.5 max-sm:portrait:flex-nowrap max-sm:portrait:overflow-x-auto max-sm:portrait:px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              class={`op-tab shrink-0 py-1.5 px-5 min-h-9 rounded-xl font-[Nunito] text-[0.9rem] font-bold text-center cursor-pointer touch-manipulation outline-none ${tab === t.id ? 'active text-white' : 'bg-(--surface) text-(--text-secondary)'}`}
              style={tab === t.id ? 'background: linear-gradient(135deg, #FF6B6B, #FF9A3C); box-shadow: 0 3px 12px rgba(0,0,0,.15);' : 'box-shadow: 0 0 0 2px var(--border), 0 2px 8px rgba(0,0,0,.08);'}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div class="flex-1 overflow-y-auto px-4 pb-8 pt-2">
        <div class="max-w-2xl mx-auto w-full">
          {loading ? (
            <div class="flex items-center justify-center py-12 text-(--text-muted)">Laddar...</div>
          ) : error ? (
            <div class="text-red-500 text-center py-8">{error}</div>
          ) : (
            <>
              {tab === 'users' && role === 'superuser' && (
                <div class="bg-(--surface) rounded-2xl border border-(--border) p-4 flex flex-col gap-6">
                  <UserTab
                    label="Admins"
                    addLabel="Lägg till admin"
                    emptyLabel="Inga admins ännu"
                    users={users.filter(u => u.profile.role === 'admin')}
                    onAdd={addAdmin}
                  />
                  <hr class="border-(--border)" />
                  <UserTab
                    label="Användare"
                    addLabel="Lägg till användare"
                    emptyLabel="Inga användare ännu"
                    users={users.filter(u => u.profile.role === 'user')}
                    onAdd={addUser}
                  />
                </div>
              )}
              {tab === 'users' && role === 'admin' && (
                <div class="bg-(--surface) rounded-2xl border border-(--border) p-4">
                  <UserTab
                    label="Användare"
                    addLabel="Lägg till användare"
                    emptyLabel="Inga användare ännu"
                    users={users}
                    onAdd={addUser}
                  />
                </div>
              )}
              {tab === 'kategorier' && (
                <KategoriTab
                  activeCategories={spaceConfig?.activeCategories ?? null}
                  onSave={updateActiveCategories}
                />
              )}
              {tab === 'videos' && (
                <VideoTab
                  videos={spaceConfig?.videos ?? {}}
                  hiddenVideos={spaceConfig?.hiddenVideos ?? []}
                  onAdd={addVideo}
                  onRemove={removeVideo}
                  onToggleHide={toggleVideoHidden}
                />
              )}
              {tab === 'installningar' && (
                <InstallningarTab
                  creditsEnabled={spaceConfig?.creditsEnabled ?? true}
                  onToggleCredits={toggleCredits}
                />
              )}
              {tab === 'statistik' && <StatistikTab users={users} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
