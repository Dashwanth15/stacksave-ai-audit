import { StrictMode, Component } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ── ErrorBoundary — catches runtime crashes, shows error instead of blank page ──
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{ background: '#0b0b15', color: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', padding: '2rem' }}>
          <div style={{ maxWidth: 600 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ color: '#f87171', marginBottom: 8 }}>App crashed</h1>
            <pre style={{ color: '#fbbf24', fontSize: 13, background: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 8, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
              {err.message}
              {'\n\n'}
              {err.stack}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
