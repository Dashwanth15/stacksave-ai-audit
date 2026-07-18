// ============================================================
// ChatBot — Floating AI assistant for pricing questions
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';

const getApiBase = (): string => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl.replace('/api', '');
  }
  // Auto-detect production environment to avoid build-time env configuration issues
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (hostname.includes('stacksave-round2-frontend.onrender.com')) {
      return 'https://stacksave-round2-backend.onrender.com';
    }
    if (hostname.includes('onrender.com')) {
      return window.location.origin.replace('-frontend', '-backend');
    }
  }
  return 'http://localhost:5000';
};

const API_BASE = getApiBase();

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_QUESTIONS = [
  'Which AI coding tool is cheapest?',
  'Claude vs ChatGPT — which is better value?',
  'How do I reduce AI SaaS spend?',
  'Should I choose annual or monthly billing?',
];

const GREETING: Message = {
  role: 'assistant',
  content: "Hey! 👋 I'm StackSave AI — your AI SaaS pricing expert.\n\nAsk me anything about tool pricing, plan comparisons, or how to optimize your AI spend. I can help you figure out which plan is right for your team!",
};

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      const willOpen = !prev;
      if (willOpen && !hasGreeted) {
        setMessages([GREETING]);
        setHasGreeted(true);
      }
      return willOpen;
    });
  }, [hasGreeted]);

  async function sendMessage(text?: string) {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await res.json();
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: data.reply || 'Sorry, something went wrong.',
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: "Couldn't connect to the server. Please try again! 🔄",
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Simple markdown-like formatting
  function formatMessage(text: string) {
    return text
      .split('\n')
      .map((line) => {
        const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return `<div class="flex gap-1.5 ml-1"><span style="color:var(--color-accent);flex-shrink:0">•</span><span>${formatted.slice(2)}</span></div>`;
        }
        if (line.trim() === '') return '<div class="h-2"></div>';
        return `<p>${formatted}</p>`;
      })
      .join('');
  }

  return (
    <>
      {/* ── Floating button ─────────────────────────────── */}
      <m.button
        onClick={handleToggle}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
        style={{
          background: 'var(--color-primary)',
          color: '#fff',
          boxShadow: '0 8px 24px rgba(30,58,95,0.3)',
        }}
        whileHover={{ scale: 1.08, boxShadow: '0 12px 32px rgba(30,58,95,0.4)' }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open AI chat assistant"
        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-h)')}
        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)')}
      >
        {isOpen ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
      </m.button>

      {/* ── Notification dot (before first open) ──────── */}
      {!isOpen && !hasGreeted && (
        <span
          className="fixed bottom-6 right-6 z-50 w-4 h-4 rounded-full border-2 translate-x-1 -translate-y-1 animate-pulse pointer-events-none"
          style={{
            background: 'var(--color-accent)',
            borderColor: 'var(--color-bg-base)',
          }}
        />
      )}

      {/* ── Chat panel ──────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0, x: 200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 200 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed top-0 right-0 z-50 w-[420px] h-screen max-w-full flex flex-col overflow-hidden border-l bg-[var(--color-bg-card)]"
            style={{
              borderColor: 'var(--color-border)',
              boxShadow: 'var(--shadow-2xl)',
            }}
          >
            {/* Header */}
            <div
              className="px-6 py-4 flex items-center justify-between border-b"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-bg-base)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{ background: 'var(--color-primary)', color: '#fff' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <div>
                  <h3
                    className="text-sm font-bold"
                    style={{ color: 'var(--color-text-heading)' }}
                  >
                    StackSave AI Assistant
                  </h3>
                  <p className="text-[10px] flex items-center gap-1 font-semibold" style={{ color: 'var(--color-success)' }}>
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ background: 'var(--color-success)' }}
                    />
                    Online · Deterministic Pricing Model Intel
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggle}
                className="w-8 h-8 rounded border flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}
                aria-label="Close chat console"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-6 space-y-4"
              style={{ background: 'var(--color-bg-base)' }}
            >
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      msg.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'
                    }`}
                    style={
                      msg.role === 'user'
                        ? { background: 'var(--color-primary)', color: '#fff' }
                        : {
                            background: 'var(--color-bg-card)',
                            color: 'var(--color-text-body)',
                            border: '1px solid var(--color-border)',
                          }
                    }
                  >
                    {msg.role === 'assistant' ? (
                      <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div
                    className="rounded-2xl rounded-bl-md px-4 py-3"
                    style={{
                      background: 'var(--color-bg-card)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div className="flex gap-1.5">
                      {[0, 150, 300].map((delay) => (
                        <span
                          key={delay}
                          className="w-2 h-2 rounded-full animate-bounce"
                          style={{ background: 'var(--color-primary)', animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick questions */}
            {messages.length <= 1 && !loading && (
              <div
                className="px-4 pb-2"
                style={{ background: 'var(--color-bg-base)', borderTop: '1px solid var(--color-border)' }}
              >
                <p className="text-[10px] mt-2 mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Quick questions:
                </p>
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {QUICK_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="text-[11px] px-2.5 py-1 rounded-full transition-all"
                      style={{
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border-strong)',
                        color: 'var(--color-text-muted)',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(30,58,95,0.06)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(30,58,95,0.3)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-card)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border-strong)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)';
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div
              className="p-3"
              style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-card)' }}
            >
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about AI tool pricing..."
                  disabled={loading}
                  className="flex-1 px-3 py-2.5 text-sm rounded-lg disabled:opacity-50 focus:outline-none placeholder:text-[#94A3B8]"
                  style={{
                    background: 'var(--color-bg-base)',
                    border: '1px solid var(--color-border-strong)',
                    color: 'var(--color-text-heading)',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,95,0.1)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'var(--color-border-strong)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  className="px-3 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: 'var(--color-primary)',
                    color: '#fff',
                    borderRadius: 'var(--radius-sm)',
                  }}
                  onMouseEnter={e => {
                    if (!(e.currentTarget as HTMLButtonElement).disabled) {
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-h)';
                    }
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)';
                  }}
                  aria-label="Send message"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
