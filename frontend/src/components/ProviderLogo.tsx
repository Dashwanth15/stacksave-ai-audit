// ============================================================
// ProviderLogo — StackSave AI Sourcing & Intelligence
// Robust, multi-size, zero-broken-image provider logo renderer
// ============================================================

import { useState } from 'react';

const PROVIDER_LOGO_MAP: Record<string, string> = {


  cursor: '/logos/cursor.svg',
  'github-copilot': '/logos/copilot.svg',
  copilot: '/logos/copilot.svg',
  claude: '/logos/claude.svg',
  chatgpt: '/logos/chatgpt.svg',
  'anthropic-api': '/logos/anthropic.svg',
  anthropic: '/logos/anthropic.svg',
  'openai-api': '/logos/openai.svg',
  openai: '/logos/openai.svg',
  gemini: '/logos/gemini.svg',
  windsurf: '/logos/windsurf.svg',
  kimi: '/logos/kimi.svg',
  deepseek: '/logos/deepseek.svg',
  perplexity: '/logos/perplexity.svg',
  codex: '/logos/openai.svg',
  'github-models': '/logos/copilot.svg',
};

const PROVIDER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  cursor: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  'github-copilot': { bg: 'bg-slate-100', text: 'text-slate-900', border: 'border-slate-300' },
  claude: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  chatgpt: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  openai: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  'openai-api': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  'anthropic-api': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  gemini: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  windsurf: { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' },
  kimi: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
  deepseek: { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200' },
  perplexity: { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200' },
  codex: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' },
  'github-models': { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' },
};

function getInitials(nameOrId: string): string {
  if (!nameOrId) return 'AI';
  const clean = nameOrId.replace(/[-_]/g, ' ').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return nameOrId.slice(0, 2).toUpperCase();
}

interface ProviderLogoProps {
  providerId?: string;
  providerName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export default function ProviderLogo({
  providerId = '',
  providerName = '',
  size = 'md',
  className = '',
}: ProviderLogoProps) {
  const [imgError, setImgError] = useState(false);

  const normalizedKey = (providerId || providerName).toLowerCase().replace(/\s+/g, '-');
  const logoSrc = PROVIDER_LOGO_MAP[normalizedKey] || PROVIDER_LOGO_MAP[normalizedKey.replace(/-api$/, '')];
  const colorTheme = PROVIDER_COLORS[normalizedKey] || {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
  };

  const sizeClasses = {
    xs: 'w-5 h-5 rounded-md text-[9px] p-0.5',
    sm: 'w-7 h-7 rounded-lg text-[10px] p-1',
    md: 'w-9 h-9 rounded-xl text-xs p-1.5',
    lg: 'w-11 h-11 rounded-xl text-sm p-2',
  }[size];

  const initials = getInitials(providerName || providerId);

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 border bg-white shadow-2xs overflow-hidden ${sizeClasses} ${className}`}
      style={{ borderColor: 'rgba(226, 232, 240, 0.9)' }}
    >
      {logoSrc && !imgError ? (
        <img
          src={logoSrc}
          alt={providerName || providerId}
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center font-bold tracking-tight ${colorTheme.bg} ${colorTheme.text}`}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
