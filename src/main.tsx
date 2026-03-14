import { render } from 'preact'
import './index.css'
import { App } from './app.tsx'
import { ToastProvider } from './contexts/ToastContext'

render(
  <ToastProvider>
    <App />
  </ToastProvider>,
  document.getElementById('app')!
)

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(reg => reg.update())
}
