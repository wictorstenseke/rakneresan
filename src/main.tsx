import { render } from 'preact'
import './index.css'
import { App } from './app.tsx'
import { ToastProvider } from './contexts/ToastContext'
import { PullToRefresh } from './components/PullToRefresh'

render(
  <ToastProvider>
    <App />
    <PullToRefresh />
  </ToastProvider>,
  document.getElementById('app')!
)

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
