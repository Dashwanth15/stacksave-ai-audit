// ============================================================
// NotFoundPage — 404 Error Page
//
// Polished 404 page with animated elements and clear CTAs.
// Keeps users engaged instead of bouncing on dead links.
// ============================================================

import { m } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center px-4">
      <m.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-card p-10 sm:p-14 text-center max-w-lg"
        style={{ borderColor: 'rgba(129, 140, 248, 0.2)' }}
      >
        <m.div
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="text-7xl mb-6"
        >
          🔍
        </m.div>

        <h1 className="text-4xl sm:text-5xl font-extrabold mb-3">
          <span className="gradient-text">404</span>
        </h1>

        <p className="text-xl text-white font-semibold mb-2">Page not found</p>
        <p className="text-[#94a3b8] mb-8 leading-relaxed">
          This page doesn't exist or the link may have expired.
          Let's get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <m.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-xl font-semibold text-white glow-primary"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            aria-label="Go to homepage"
          >
            ← Back to Home
          </m.button>
          <m.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/audit')}
            className="px-6 py-3 rounded-xl font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
            aria-label="Start a new audit"
          >
            Start Free Audit →
          </m.button>
        </div>
      </m.div>
    </div>
  );
}
