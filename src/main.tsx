import { render } from 'preact'
import './index.css'
import { App } from './app.tsx'
import { ToastProvider } from './contexts/ToastContext'
import { PullToRefresh } from './components/PullToRefresh'
import { usePullToRefresh } from './hooks/usePullToRefresh'

function Root() {
  const ptr = usePullToRefresh()

  // Content offset mirrors indicator position so the spinner has clear space above the content
  const indicatorTranslateY = ptr.phase === 'refreshing'
    ? 34
    : Math.max(0, ptr.pullDistance - ptr.showThreshold - 10)
  const contentOffset = indicatorTranslateY

  return (
    <ToastProvider>
      <div style={{
        transform: `translateY(${contentOffset}px)`,
        transition: ptr.phase === 'idle' ? 'transform 0.3s ease-out' : 'none',
        willChange: contentOffset > 0 ? 'transform' : 'auto',
      }}>
        <App />
      </div>
      <PullToRefresh {...ptr} />
    </ToastProvider>
  )
}

render(<Root />, document.getElementById('app')!)

if ('serviceWorker' in navigator) {
  // When a new SW activates and takes control, reload to get fresh assets
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true
      window.location.reload()
    }
  })

  // Check for SW updates when app returns from background (important for iOS PWA)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.ready.then(reg => reg.update())
    }
  })
}
