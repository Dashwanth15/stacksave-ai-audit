import { useState, useRef, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import type { ToolInfo } from '../types';

interface ToolBrowserProps {
  tools: ToolInfo[];
  selectedToolIds: string[];
  onToggle: (toolId: string) => void;
  logoMap: Record<string, string>;
  parentToolIds?: string[] | null;
  currentVersion?: number | null;
}

export default function ToolBrowser({
  tools,
  selectedToolIds,
  onToggle,
  logoMap,
  parentToolIds,
  currentVersion,
}: ToolBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const isReAudit = parentToolIds !== null && parentToolIds !== undefined;
  const targetVersionNumber = currentVersion || 2;

  // Dynamic categories from catalog
  const categories = ['All', ...Array.from(new Set(tools.map((t) => t.category)))];

  // Filter tools (View layer only)
  const filteredTools = tools.filter((tool) => {
    const matchesCategory =
      activeCategory === 'All' || tool.category.toLowerCase() === activeCategory.toLowerCase();

    const query = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !query ||
      tool.name.toLowerCase().includes(query) ||
      tool.category.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query) ||
      tool.id.toLowerCase().includes(query);

    return matchesCategory && matchesQuery;
  });

  // Check scroll positions for disabling navigation arrows
  const updateScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState, filteredTools.length]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const scrollAmount = Math.max(el.clientWidth * 0.75, 260);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const selectedToolsList = tools.filter((t) => selectedToolIds.includes(t.id));

  return (
    <div className="space-y-4">
      {/* ── Search Bar & Category Filters ────────────────────────── */}
      <div className="space-y-3">
        {/* Search input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search AI tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 rounded-lg text-xs transition-all focus:outline-none placeholder:text-slate-400"
            style={{
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-heading)',
            }}
            aria-label="Search AI tools"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs w-full max-w-full touch-pan-x overscroll-x-contain">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className="px-3 py-1.5 rounded-md font-semibold text-[11px] whitespace-nowrap transition-all cursor-pointer shrink-0"
                style={
                  isActive
                    ? {
                        background: 'var(--color-primary)',
                        color: '#ffffff',
                        boxShadow: 'var(--shadow-xs)',
                      }
                    : {
                        background: 'var(--color-bg-base)',
                        color: 'var(--color-text-muted)',
                        border: '1px solid var(--color-border)',
                      }
                }
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Carousel Header & Navigation Controls ───────────────── */}
      <div className="relative group w-full max-w-full min-w-0">
        {filteredTools.length > 0 ? (
          <>
            {/* Header / Mobile & Desktop Navigation Arrows & Swipe Hint */}
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-2 px-0.5 w-full">
              <div className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-500 font-medium select-none">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 shrink-0">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span>Swipe to browse {filteredTools.length} tools</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 shrink-0">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleScroll('left')}
                  disabled={!canScrollLeft}
                  aria-label="Scroll tools left"
                  className="p-1 sm:p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-25 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer flex items-center justify-center min-h-[28px] min-w-[28px] sm:min-h-[32px] sm:min-w-[32px]"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleScroll('right')}
                  disabled={!canScrollRight}
                  aria-label="Scroll tools right"
                  className="p-1 sm:p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-25 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer flex items-center justify-center min-h-[28px] min-w-[28px] sm:min-h-[32px] sm:min-w-[32px]"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Container (2 Rows Horizontal Carousel with adaptive column sizing) */}
            <div
              ref={scrollContainerRef}
              className="tool-browser-carousel auto-cols-[180px] min-[360px]:auto-cols-[195px] min-[400px]:auto-cols-[215px] sm:auto-cols-[240px] gap-2.5 sm:gap-3 py-1 px-0.5"
            >
              {filteredTools.map((tool) => {
                const isSelected = selectedToolIds.includes(tool.id);
                const isNew = isReAudit && isSelected && !parentToolIds.includes(tool.id);
                const logoSrc = logoMap[tool.id];

                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => onToggle(tool.id)}
                    id={`tool-toggle-${tool.id}`}
                    aria-pressed={isSelected}
                    aria-label={`Toggle ${tool.name}`}
                    title={isNew ? `Added in Version ${targetVersionNumber}` : undefined}
                    className={`tool-carousel-card snap-start shrink-0 cursor-pointer ${
                      isNew
                        ? 'tool-carousel-card--new-selected'
                        : isSelected
                        ? 'tool-carousel-card--selected'
                        : ''
                    }`}
                  >
                    <div className="flex flex-col justify-between h-full p-3 sm:p-4 text-left">
                      <div>
                        {/* Card Header: Logo, Name, Check */}
                        <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
                          <div
                            className={`tool-card-premium__logo-container ${
                              isNew
                                ? 'tool-card-premium__logo-container--selected bg-emerald-50/60 border-emerald-200'
                                : isSelected
                                ? 'tool-card-premium__logo-container--selected'
                                : ''
                            }`}
                          >
                            <img
                              src={logoSrc}
                              alt={tool.name}
                              className={`tool-card-premium__logo-img logo-${tool.id}`}
                            />
                          </div>

                          <div
                            className={`tool-card-premium__check ${
                              isNew
                                ? 'tool-card-premium__check--new-selected'
                                : isSelected
                                ? 'tool-card-premium__check--selected'
                                : ''
                            }`}
                          >
                            {isSelected && (
                              <svg
                                width="9"
                                height="9"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                        </div>

                        {/* Title & Category */}
                        <div className="mb-1.5 sm:mb-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-bold text-xs tracking-tight block text-[var(--color-text-heading)] truncate">
                              {tool.name}
                            </span>
                            {isNew && (
                              <span
                                className="shrink-0 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.25 rounded bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs"
                                title={`Added in Version ${targetVersionNumber}`}
                              >
                                NEW
                              </span>
                            )}
                          </div>
                          <span
                            className={`category-pill category-pill--${tool.category
                              .toLowerCase()
                              .replace(' ', '-')} mt-1 inline-block`}
                          >
                            {tool.category}
                          </span>
                        </div>

                        {/* Description (2-line clamp) */}
                        <p className="text-[10.5px] sm:text-[11px] text-[var(--color-text-body)] leading-relaxed line-clamp-2">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          /* Empty Search State */
          <div className="py-10 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50">
            <p className="text-xs font-bold text-slate-700">No AI tools found</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Try a different tool name, provider, or category.
            </p>
          </div>
        )}
      </div>

      {/* ── Selected Tools Removable Chips Strip ─────────────────── */}
      <AnimatePresence>
        {selectedToolsList.length > 0 && (
          <m.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="pt-2 border-t border-slate-100 space-y-2"
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-500">Selected Stack ({selectedToolsList.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedToolsList.map((tool) => {
                const isNew = isReAudit && !parentToolIds.includes(tool.id);
                return (
                  <span
                    key={tool.id}
                    className={`selected-chip inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      isNew
                        ? 'bg-emerald-50 text-emerald-950 border border-emerald-300 shadow-2xs'
                        : 'bg-emerald-50/60 text-emerald-900 border border-emerald-200/80 hover:bg-emerald-100/70'
                    }`}
                    title={isNew ? `Added in Version ${targetVersionNumber}` : undefined}
                  >
                    <span>{tool.name}</span>
                    {isNew && (
                      <span className="text-[8px] font-black uppercase tracking-wider px-1 py-0.25 rounded bg-emerald-600 text-white leading-none">
                        NEW
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggle(tool.id);
                      }}
                      className="text-emerald-600 hover:text-emerald-900 font-bold ml-0.5 text-xs focus:outline-none cursor-pointer"
                      aria-label={`Remove ${tool.name}`}
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
