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
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 hover:text-slate-950 shadow-2xs transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300"
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

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
        className={`group flex items-center gap-2 h-8 pl-1 pr-2 rounded-lg border transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-200 ${
          dropdownOpen
            ? 'border-slate-300 bg-slate-50 shadow-xs'
            : 'border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50/70 shadow-2xs'
        }`}
        aria-haspopup="true"
        aria-expanded={dropdownOpen}
        aria-label="User account menu"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-6 h-6 rounded-full object-cover border border-slate-200/80 shrink-0"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-medium shrink-0">
            {initial}
          </div>
        )}
        <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 tracking-tight max-w-[100px] truncate">
          {displayName}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-slate-400 group-hover:text-slate-600 transition-transform duration-150 shrink-0 ${
            dropdownOpen ? 'rotate-180 text-slate-600' : ''
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Account Dropdown Surface */}
      <AnimatePresence>
        {dropdownOpen && (
          <m.div
            initial={{ opacity: 0, scale: 0.97, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white border border-slate-200/90 shadow-lg shadow-slate-900/5 py-1 z-50 text-left focus:outline-none"
            role="menu"
          >
            {/* User Profile Header */}
            <div className="px-3 py-2.5 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-900 truncate leading-tight">
                {user.name}
              </p>
              <p className="text-[11px] text-slate-500 truncate mt-0.5 leading-tight">
                {user.email}
              </p>
              {/* Subtle Plan Status & Live Database Usage */}
              <div className="mt-1.5 flex flex-col gap-1 text-[11px] text-slate-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                  <span className="truncate">
                    {user.plan === 'PREMIUM' ? 'StackSave Premium' : 'StackSave Free'}
                  </span>
                </div>
                {user.plan !== 'PREMIUM' && usage && (
                  <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 pl-3">
                    <span>{usage.savedAudits.current}/2 saved</span>
                    <span className="text-slate-300">·</span>
                    <span>{usage.shareLinks.current}/5 shares</span>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Links */}
            <div className="p-1 space-y-0.5" role="none">
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
                    className={`group w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
                      isActive
                        ? 'bg-slate-100/80 text-slate-950 font-semibold'
                        : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                    }`}
                    role="menuitem"
                  >
                    <span
                      className={`shrink-0 transition-colors ${
                        isActive
                          ? 'text-slate-900'
                          : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Destructive Action: Understated Sign out */}
            <div className="p-1 border-t border-slate-100" role="none">
              <button
                onClick={async () => {
                  setDropdownOpen(false);
                  await logout();
                  navigate('/');
                }}
                className="group w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50/60 transition-colors text-left cursor-pointer"
                role="menuitem"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-slate-400 group-hover:text-rose-500 shrink-0 transition-colors"
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
