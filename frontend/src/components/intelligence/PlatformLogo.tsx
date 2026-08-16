// ============================================================
// PlatformLogo.tsx
// Shared official AI platform logo renderer
// Zero pill / container wrapper — sits cleanly beside text
// ============================================================

interface PlatformLogoProps {
  name: string;
  className?: string;
}

export default function PlatformLogo({ name, className = 'w-5 h-5' }: PlatformLogoProps) {
  const n = (name || '').toLowerCase();

  if (n.includes('chatgpt') || n.includes('gpt')) {
    return <img src="/logos/chatgpt.svg" alt={name} className={`${className} object-contain shrink-0`} />;
  }
  if (n.includes('openai')) {
    return <img src="/logos/openai.svg" alt={name} className={`${className} object-contain shrink-0`} />;
  }
  if (n.includes('claude')) {
    return <img src="/logos/claude.svg" alt={name} className={`${className} object-contain shrink-0`} />;
  }
  if (n.includes('anthropic')) {
    return <img src="/logos/anthropic.svg" alt={name} className={`${className} object-contain shrink-0`} />;
  }
  if (n.includes('gemini') || n.includes('google')) {
    return <img src="/logos/gemini.svg" alt={name} className={`${className} object-contain shrink-0`} />;
  }
  if (n.includes('cursor')) {
    return <img src="/logos/cursor.svg" alt={name} className={`${className} object-contain shrink-0`} />;
  }
  if (n.includes('windsurf') || n.includes('codeium')) {
    return <img src="/logos/windsurf.svg" alt={name} className={`${className} object-contain shrink-0`} />;
  }
  if (n.includes('copilot') || n.includes('github')) {
    return <img src="/logos/copilot.svg" alt={name} className={`${className} object-contain shrink-0`} />;
  }
  if (n.includes('kimi') || n.includes('moonshot')) {
    return <img src="/logos/kimi.svg" alt={name} className={`${className} object-contain shrink-0`} />;
  }
  if (n.includes('deepseek')) {
    return (
      <svg className={`${className} shrink-0`} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="#1E40AF" />
        <path d="M7 13.5C8 10.5 11 8.5 15 9M9 16C12 16 16 14.5 17 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (n.includes('perplexity')) {
    return (
      <svg className={`${className} shrink-0`} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="5" fill="#0F766E" />
        <path d="M12 4V20M4 12H20M6.5 6.5L17.5 17.5M17.5 6.5L6.5 17.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  // Fallback AI spark icon
  return (
    <svg className={`${className} shrink-0 text-indigo-600`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
    </svg>
  );
}
