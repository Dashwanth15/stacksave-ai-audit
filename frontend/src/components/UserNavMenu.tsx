// ============================================================
// UserNavMenu — StackSave Navbar Authentication Action & Menu
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { fetchUserUsage } from '../services/api';
import type { UserUsageResponse } from '../types';

export default function UserNavMenu() {
  const { user, authenticated, loading, logout, openAuthModal } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [usage, setUsage] = useState<UserUsageResponse | null>(null);

  // Fetch real usage stats when authenticated and menu is opened
  useEffect(() => {
    if (authenticated) {
      fetchUserUsage()
        .then(setUsage)
        .catch(() => {});
    }
  }, [authenticated, dropdownOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setDropdownOpen(false);
    }
    if (dropdownOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [dropdownOpen]);

  // Loading skeleton placeholder to prevent layout shifts
  if (loading) {
    return (
      <div className="h-8 w-24 rounded-lg bg-slate-100 animate-pulse border border-slate-200/60" />
    );
  }

  // Unauthenticated / Guest: Clean SaaS Sign in CTA
  if (!authenticated || !user) {
    return (
      <button
        onClick={() => openAuthModal({ reason: 'Sign in to StackSave' })}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 hover:text-slate-950 shadow-2xs transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300 shrink-0 min-h-0"
        aria-label="Sign in with Google"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" className="shrink-0" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.33 24 12 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27a7.18 7.18 0 0 1 0-4.54V6.58H1.26a11.98 11.98 0 0 0 0 10.84l4.02-3.15Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
          />
        </svg>
        <span>Sign in</span>
      </button>
    );
  }

  // Authenticated user avatar + dropdown
  const displayName = user.name ? user.name.split(' ')[0] : 'Account';
  const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
  const isPro = user.plan === 'PREMIUM';

  // Usage percentage for the mini progress bar
  const savedCount = usage?.savedAudits.current ?? 1;
  const savedLimit = 2;
  const usagePercentage = Math.min(100, Math.max(15, (savedCount / savedLimit) * 100));

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="sm:w-[18px] sm:h-[18px]">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      id: 'audits',
      label: 'My Audits',
      path: '/dashboard/audits',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="sm:w-[18px] sm:h-[18px]">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      id: 'stack',
      label: 'My Stack',
      path: '/dashboard/stack',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="sm:w-[18px] sm:h-[18px]">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      path: '/dashboard/settings',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="sm:w-[18px] sm:h-[18px]">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Refined Account Trigger Control */}
      <button
        onClick={() => setDropdownOpen((prev) => !prev)}
        className={`group flex items-center gap-1.5 sm:gap-2.5 h-8.5 sm:h-9 pl-1 sm:pl-1.5 pr-2 sm:pr-3 rounded-full border transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 select-none shrink-0 min-h-0 ${
          dropdownOpen
            ? isPro
              ? 'border-amber-400 bg-amber-50/70 shadow-xs ring-2 ring-amber-100'
              : 'border-slate-300 bg-slate-100/70 shadow-xs'
            : isPro
              ? 'border-amber-300/90 hover:border-amber-400 bg-amber-50/30 hover:bg-amber-50/60 shadow-2xs'
              : 'border-slate-200/90 hover:border-slate-300/80 bg-white hover:bg-slate-50/80 shadow-2xs'
        }`}
        aria-haspopup="true"
        aria-expanded={dropdownOpen}
        aria-label="User account menu"
      >
        <div className="relative shrink-0">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className={`w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full object-cover shrink-0 transition-all duration-150 ${
                isPro
                  ? 'ring-2 ring-amber-400 ring-offset-1 sm:ring-offset-1.5 ring-offset-white'
                  : 'ring-1 ring-slate-200/90'
              }`}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div
              className={`w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full text-white flex items-center justify-center text-[10px] sm:text-[10.5px] font-semibold shrink-0 transition-all duration-150 ${
                isPro
                  ? 'bg-gradient-to-tr from-amber-500 to-amber-600 ring-2 ring-amber-400 ring-offset-1 sm:ring-offset-1.5 ring-offset-white'
                  : 'bg-slate-900 ring-1 ring-slate-200/90'
              }`}
            >
              {initial}
            </div>
          )}
          {isPro && (
            <span
              className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-3 sm:w-3.5 h-3 sm:h-3.5 rounded-full bg-amber-500 text-white ring-1.5 ring-white shadow-2xs"
              title="Pro Member"
            >
              <svg width="7" height="7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
              </svg>
            </span>
          )}
        </div>
        <span className="hidden sm:inline-block text-xs font-semibold text-slate-800 group-hover:text-slate-950 tracking-tight max-w-[105px] truncate">
          {displayName}
        </span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-slate-400 group-hover:text-slate-600 transition-transform duration-150 shrink-0 ${
            dropdownOpen ? 'rotate-180 text-slate-700' : ''
          }`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Mobile Backdrop Overlay */}
      <AnimatePresence>
        {dropdownOpen && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="fixed inset-0 bg-slate-950/20 backdrop-blur-[1px] z-40 sm:hidden"
            onClick={() => setDropdownOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Account Dropdown Surface */}
      <AnimatePresence>
        {dropdownOpen && (
          <m.div
            initial={{ opacity: 0, scale: 0.98, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-3 top-[60px] sm:absolute sm:right-0 sm:top-full sm:mt-2 w-[calc(100vw-24px)] max-w-[280px] sm:w-[285px] sm:max-w-[285px] rounded-2xl bg-white border border-slate-200/90 shadow-[0_16px_36px_-6px_rgba(15,23,42,0.16),0_4px_12px_-2px_rgba(15,23,42,0.06)] z-50 text-left focus:outline-none overflow-hidden"
            role="menu"
          >
            {/* Section 1: User Profile Header */}
            <div className="px-3.5 pt-3.5 pb-2.5 sm:px-4 sm:pt-4 flex items-center gap-3 sm:gap-3.5">
              <div className="relative shrink-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className={`w-11 h-11 sm:w-13 sm:h-13 rounded-full object-cover transition-all duration-150 ${
                      isPro
                        ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-white shadow-xs'
                        : 'ring-2 ring-slate-200/90 ring-offset-2 ring-offset-white shadow-2xs'
                    }`}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div
                    className={`w-11 h-11 sm:w-13 sm:h-13 rounded-full text-white flex items-center justify-center text-sm sm:text-base font-bold shadow-2xs transition-all duration-150 ${
                      isPro
                        ? 'bg-gradient-to-tr from-amber-500 to-amber-600 ring-2 ring-amber-400 ring-offset-2 ring-offset-white'
                        : 'bg-slate-900 ring-2 ring-slate-200/90 ring-offset-2 ring-offset-white'
                    }`}
                  >
                    {initial}
                  </div>
                )}
                {isPro && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 flex items-center justify-center w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-amber-500 text-white ring-2 ring-white shadow-2xs"
                    title="StackSave Pro Member"
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" className="sm:w-[10.5px] sm:h-[10.5px]">
                      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                    </svg>
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] sm:text-[15px] font-bold text-slate-900 tracking-tight leading-snug truncate">
                  {user.name}
                </p>
                <p className="text-[11.5px] sm:text-xs text-slate-500 font-normal truncate mt-0.5 leading-tight">
                  {user.email}
                </p>
              </div>
            </div>

            {/* Section 2: Highlighted Plan Card */}
            {isPro ? (
              <div className="mx-3 sm:mx-3.5 my-1.5 sm:my-2 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[#FFF9EE] border border-[#FDE5B4] shadow-2xs">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#FDECC8] text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" className="sm:w-5 sm:h-5">
                      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[13px] sm:text-[13.5px] font-bold text-slate-950 tracking-tight">Pro Plan</p>
                      <span className="text-[10px] sm:text-[11px] font-medium text-slate-600 shrink-0">
                        {usage ? `${usage.savedAudits.current}/2 saved · ${usage.shareLinks.current}/5 shares` : 'Unlimited power'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-[10.5px] sm:text-[11px] text-amber-900/75 font-medium truncate">Unlock full power</p>
                      <div className="w-16 sm:w-20 h-1.5 rounded-full bg-amber-200/80 overflow-hidden shrink-0">
                        <div className="h-full bg-amber-500 rounded-full w-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-3 sm:mx-3.5 my-1.5 sm:my-2 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200/90 shadow-2xs">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white border border-slate-200/90 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[18px] sm:h-[18px]">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[13px] sm:text-[13.5px] font-bold text-slate-900 tracking-tight">Free Plan</p>
                      <span className="text-[10px] sm:text-[11px] font-medium text-slate-600 shrink-0">
                        {usage ? `${usage.savedAudits.current}/2 saved · ${usage.shareLinks.current}/5 shares` : '2 saved · 5 shares'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-[10.5px] sm:text-[11px] text-slate-500 font-medium truncate">Free Tier</p>
                      <div className="w-16 sm:w-20 h-1.5 rounded-full bg-slate-200 overflow-hidden shrink-0">
                        <div
                          className="h-full bg-slate-700 rounded-full transition-all duration-300"
                          style={{ width: `${usagePercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Section 3: Navigation Links */}
            <div className="px-2 py-1 space-y-0.5" role="none">
              {menuItems.map((item) => {
                const isActive =
                  item.path === '/dashboard'
                    ? location.pathname === '/dashboard'
                    : location.pathname.startsWith(item.path);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate(item.path);
                    }}
                    className={`group w-full flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-xl text-[13px] sm:text-[13.5px] font-medium transition-colors duration-150 text-left cursor-pointer focus:outline-none focus-visible:bg-slate-100 min-h-[38px] sm:min-h-[42px] ${
                      isActive
                        ? 'bg-slate-100/90 text-slate-950 font-semibold'
                        : 'text-slate-700 hover:text-slate-950 hover:bg-slate-50/90'
                    }`}
                    role="menuitem"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <span
                        className={`shrink-0 transition-colors duration-150 ${
                          isActive ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-800'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-slate-400 group-hover:text-slate-600 transition-transform duration-150 group-hover:translate-x-0.5 shrink-0"
                      aria-hidden="true"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                );
              })}
            </div>

            {/* Section 4: Refined Destructive Action: Sign out */}
            <div className="px-2 pt-1 pb-2 border-t border-slate-100/90" role="none">
              <button
                onClick={async () => {
                  setDropdownOpen(false);
                  await logout();
                  navigate('/');
                }}
                className="group w-full flex items-center gap-2.5 sm:gap-3 px-3 py-2 sm:py-2.5 rounded-xl text-[13px] sm:text-[13.5px] font-semibold text-rose-600 hover:bg-rose-50/70 transition-colors duration-150 text-left cursor-pointer focus:outline-none focus-visible:bg-rose-50 min-h-[38px] sm:min-h-[42px]"
                role="menuitem"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-rose-500 group-hover:text-rose-600 shrink-0 transition-colors duration-150"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Sign out</span>
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
