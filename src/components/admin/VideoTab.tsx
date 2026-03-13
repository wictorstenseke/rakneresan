import { useEffect, useState } from 'preact/hooks'
import { extractYouTubeId, fetchVideoTitle, REWARD_VIDEO_IDS } from '../../lib/youtube'

export function VideoTab({
  videos,
  hiddenVideos,
  onAdd,
  onRemove,
  onToggleHide,
}: {
  videos: Record<string, string[]>
  hiddenVideos: string[]
  onAdd: (catId: string, id: string) => Promise<void>
  onRemove: (catId: string, id: string) => Promise<void>
  onToggleHide: (id: string) => Promise<void>
}) {
  const [titles, setTitles] = useState<Record<string, string>>({})
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  // Flatten configured videos preserving source catId
  const flatVideos: { catId: string; id: string }[] = Object.entries(videos).flatMap(
    ([catId, ids]) => ids.map(id => ({ catId, id }))
  )
  const customIds = new Set(flatVideos.map(v => v.id))
  const customCatMap = new Map(flatVideos.map(v => [v.id, v.catId]))

  // Combined list: defaults first, then custom-added (deduped)
  const allIds = [...new Set([...REWARD_VIDEO_IDS, ...flatVideos.map(v => v.id)])]
  const hiddenSet = new Set(hiddenVideos)
  const activeCount = allIds.filter(id => !hiddenSet.has(id)).length

  useEffect(() => {
    let cancelled = false
    allIds.forEach(id => {
      if (titles[id] !== undefined) return
      fetchVideoTitle(id).then(title => {
        if (!cancelled && title) setTitles(prev => ({ ...prev, [id]: title }))
      })
    })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos])

  async function handleAdd() {
    const raw = input.trim()
    if (!raw) return
    const id = extractYouTubeId(raw)
    if (!id) {
      setError('Ogiltig YouTube-URL')
      return
    }
    await onAdd('shop', id)
    setInput('')
    setError('')
    setShowForm(false)
    fetchVideoTitle(id).then(title => {
      if (title) setTitles(prev => ({ ...prev, [id]: title }))
    })
  }

  return (
    <div class="flex flex-col gap-4">
      {/* Header + add toggle */}
      <div class="flex justify-between items-end">
        <div>
          <h2 class="text-lg font-bold text-(--text)">Videos</h2>
          <p class="text-sm text-(--text-muted)">
            {activeCount} av {allIds.length} aktiva
          </p>
          <p class="text-xs text-(--text-muted) mt-1">Dolda videos visas inte i användarnas shop.</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(s => !s); setError('') }}
          class={showForm ? 'btn-add-user btn-add-user-cancel' : 'btn-add-user'}
        >
          {showForm ? '✕ Avbryt' : '+ Lägg till'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div class="bg-(--surface) rounded-2xl p-4 flex flex-col gap-3 border border-(--border)">
          <input
            type="url"
            placeholder="YouTube-URL eller video-ID"
            value={input}
            onInput={e => {
              setInput((e.target as HTMLInputElement).value)
              setError('')
            }}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            class="w-full border border-(--border) rounded-xl px-3 py-3 bg-(--bg) text-(--text) text-base"
            autoFocus
          />
          {error && <p class="text-xs text-red-400">{error}</p>}
          <div class="flex justify-end">
            <button type="button" onClick={handleAdd} class="btn-add-user">
              Lägg till
            </button>
          </div>
        </div>
      )}

      {/* Video list */}
      <div class="flex flex-col gap-1.5">
        {allIds.map(id => {
          const isHidden = hiddenSet.has(id)
          const isCustom = customIds.has(id)
          return (
            <div
              key={id}
              role="button"
              tabIndex={0}
              onClick={() => onToggleHide(id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleHide(id); } }}
              class={`flex items-center gap-2 cursor-pointer rounded-2xl border border-(--border) px-4 py-2 min-h-9 transition-all duration-200 hover:bg-(--border) ${isHidden ? 'opacity-75 hover:opacity-95' : ''}`}
              style="background-color: var(--surface)"
            >
              <span
                class="shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-bold"
                style={!isHidden ? 'border-color: var(--tc); color: white; background: var(--tc)' : 'border-color: var(--border); background: var(--surface)'}
                aria-hidden
              >
                {!isHidden ? '✓' : ''}
              </span>
              <span class="text-base shrink-0">🎬</span>
              <span class={`flex-1 text-sm truncate min-w-0 ${isHidden ? 'text-(--text-muted)' : 'text-(--text)'}`} title={id}>
                {titles[id] ?? id}
                {!isCustom && <span class="text-(--text-muted) text-xs ml-1">standard</span>}
              </span>
              {isCustom && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onRemove(customCatMap.get(id)!, id); }}
                  class="back-chip text-xs px-3 py-1 shrink-0"
                  style="border-color: #f87171; color: #f87171;"
                >
                  Radera
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
