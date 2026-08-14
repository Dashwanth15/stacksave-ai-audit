// ============================================================
// VersionSelectorPopover — Compact Inline Version Selector
// ============================================================

import { useState, useRef, useEffect } from 'react';
import type { ModelOption } from '../data/providerKnowledge';

interface VersionSelectorPopoverProps {
  models: ModelOption[];
  selectedModelId: string;
  onSelect: (model: ModelOption) => void;
}

export default function VersionSelectorPopover({
  models,
  selectedModelId,
  onSelect,
}: VersionSelectorPopoverProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const selectedModel = models.find(
    (m) => m.modelId.toLowerCase() === selectedModelId.toLowerCase() || m.name.toLowerCase() === selectedModelId.toLowerCase()
  ) || models[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  if (!models || models.length <= 1) {
    return (
      <span className="text-[11px] font-medium text-slate-400 px-2 py-0.5 rounded border border-slate-200/60 bg-slate-50/50">
        {selectedModel?.shortName || selectedModel?.name || 'Default'}
      </span>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        style={{
          background: 'var(--color-bg-surface)',
          color: 'var(--color-primary)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
        aria-label="Select model version"
        aria-expanded={open}
      >
        <span>{selectedModel?.shortName || selectedModel?.name}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 mt-1.5 z-50 min-w-[190px] py-1.5 rounded-lg shadow-xl border bg-white animate-fade-in"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="px-3 py-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            Select Model Version
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {models.map((m) => {
              const isSelected = m.modelId.toLowerCase() === selectedModel.modelId.toLowerCase();
              return (
                <button
                  key={m.modelId}
                  type="button"
                  onClick={() => {
                    onSelect(m);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-col">
                    <span>{m.name}</span>
                  </div>
                  {isSelected && <span className="text-emerald-600 font-bold text-sm ml-2">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
