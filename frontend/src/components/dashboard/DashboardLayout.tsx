// ============================================================
// DashboardLayout — StackSave AI Application Shell
// ============================================================

import { type ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../Logo';
import UserNavMenu from '../UserNavMenu';
import OfferNotificationBell from '../OfferNotificationBell';
import { useAuth } from '../../context/AuthContext';
import { fetchUserUsage } from '../../services/api';
import type { UserUsageResponse } from '../../types';

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab: 'overview' | 'audits' | 'stack' | 'settings';
  pageTitle: string;
  pageSubtitle?: string;
  action?: ReactNode;
}

export default function DashboardLayout({
  children,
  activeTab,
  pageTitle,
  pageSubtitle,
  action,
}: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [usage, setUsage] = useState<UserUsageResponse | null>(null);

  useEffect(() => {
    fetchUserUsage()
      .then(setUsage)
      .catch(() => {});
  }, []);

  const isPremium = user?.plan === 'PREMIUM';
  const auditUsed = usage?.savedAudits?.current ?? 0;
  const auditLimit = usage?.savedAudits?.limit ?? 2;
  const shareUsed = usage?.shareLinks?.current ?? 0;
  const shareLimit = usage?.shareLinks?.limit ?? 5;
  const auditPct = Math.min(100, Math.round((auditUsed / auditLimit) * 100));

  const navLinks = [
    {
      id: 'overview',
      label: 'Dashboard',
      path: '/dashboard',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      id: 'audits',
      label: 'My Audits',
      path: '/dashboard/audits',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      id: 'stack',
      label: 'My Stack',
      path: '/dashboard/stack',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  const SidebarNav = ({ onNav }: { onNav?: () => void }) => (
    <nav className="p-2 space-y-0.5" aria-label="Dashboard navigation">
      {navLinks.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              onNav?.();
              navigate(item.path);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] transition-colors duration-150 text-left cursor-pointer ${
              isActive
                ? 'bg-indigo-50 text-slate-900 font-semibold'
                : 'text-slate-700 font-medium hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {/* Left accent bar — only on active */}
            <span
              className={`shrink-0 w-[3px] h-[18px] rounded-full -ml-1 ${
                isActive ? 'bg-indigo-500' : 'bg-transparent'
              }`}
            />
            {/* Icon */}
            <span
              className={`shrink-0 transition-colors duration-150 ${
                isActive ? 'text-indigo-600' : 'text-slate-500'
              }`}
            >
              {item.icon}
            </span>
            {/* Label */}
            <span className="leading-none">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#EBEFF5]">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 bg-white border-b border-slate-200"
        style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.07)' }}
      >
        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4"
          style={{ height: '52px' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen((prev) => !prev)}
              className="md:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors duration-150"
              aria-label="Toggle navigation"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <button
              onClick={() => navigate('/')}
              className="focus:outline-none cursor-pointer shrink-0"
              aria-label="StackSave Home"
            >
              <Logo asDiv />
            </button>

            <div className="hidden lg:flex items-center gap-0.5 ml-3 pl-4 border-l border-slate-200">
              {[
                { label: 'AI Offers', path: '/offers' },
                { label: 'Run Audit', path: '/audit' },
                { label: 'Build Stack', path: '/build-stack' },
              ].map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className="px-2.5 py-1.5 rounded-md text-[12px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <OfferNotificationBell />
            <UserNavMenu />
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">

          {/* ── Sidebar ──────────────────────────────────────────── */}
          <aside className="hidden md:flex flex-col w-52 shrink-0 gap-3">

            {/* Navigation card */}
            <div
              className="rounded-xl bg-white border border-slate-200"
              style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}
            >
              <SidebarNav />
            </div>

            {/* Plan / account card */}
            <div
              className="rounded-xl bg-white border border-slate-200 overflow-hidden"
              style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.08)' }}
            >
              {/* ── Card header — identity section ─── */}
              <div className="px-4 pt-4 pb-4 border-b border-slate-100 bg-[#F4F6FF]">

                {/* Plan name with left accent */}
                <div className="flex items-center gap-2">
                  <div className={`w-[3px] h-5 rounded-full shrink-0 ${isPremium ? 'bg-amber-400' : 'bg-indigo-400'}`} />
                  <p className="text-[15px] font-bold text-slate-900 leading-tight">
                    {isPremium ? 'Premium Plan' : 'Free Plan'}
                  </p>
                </div>

                {/* Account type */}
                <p className="text-[12px] font-medium text-slate-500 mt-2 ml-[11px]">
                  {isPremium ? 'Full access' : 'Personal account'}
                </p>

                {/* Email */}
                {user?.email && (
                  <p
                    className="text-[11.5px] text-slate-500 mt-1 ml-[11px] truncate"
                    title={user.email}
                  >
                    {user.email}
                  </p>
                )}
              </div>

              {/* ── Card body — usage + CTA ────────── */}
              <div className="px-4 py-4">
                {!isPremium && usage && (
                  <div className="space-y-3">
                    {/* Usage rows */}
                    <div className="space-y-2.5">
                      {/* Saved audits */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[12px] font-medium text-slate-600">Saved audits</span>
                          <span
                            className={`text-[12px] font-bold tabular-nums ${
                              auditPct >= 100
                                ? 'text-rose-500'
                                : auditPct >= 75
                                ? 'text-amber-500'
                                : 'text-slate-900'
                            }`}
                          >
                            {auditUsed} / {auditLimit}
                          </span>
                        </div>
                        <div className="h-[3px] rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              auditPct >= 100
                                ? 'bg-rose-400'
                                : auditPct >= 75
                                ? 'bg-amber-400'
                                : 'bg-indigo-400'
                            }`}
                            style={{ width: `${auditPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Share links */}
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-slate-600">Share links</span>
                        <span className="text-[12px] font-bold text-slate-900 tabular-nums">
                          {shareUsed} / {shareLimit}
                        </span>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-slate-100" />

                    {/* Upgrade CTA */}
                    <button
                      onClick={() => navigate('/dashboard/settings')}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-[12px] font-bold transition-colors duration-150 cursor-pointer"
                      style={{ boxShadow: '0 2px 6px rgba(15,23,42,0.25)' }}
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      Upgrade to Premium
                    </button>
                  </div>
                )}

                {isPremium && (
                  <p className="text-[12px] text-slate-500 leading-relaxed">
                    Unlimited audits &amp; full intelligence access.
                  </p>
                )}
              </div>
            </div>
          </aside>

          {/* ── Mobile Drawer ────────────────────────────────────── */}
          {mobileSidebarOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex">
              <div
                className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <div className="relative w-64 bg-white h-full p-5 shadow-xl flex flex-col gap-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <Logo asDiv size="sm" />
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <SidebarNav onNav={() => setMobileSidebarOpen(false)} />
                <div className="mt-auto pt-4 border-t border-slate-100 text-[11px] text-slate-400">
                  Signed in as{' '}
                  <span className="font-medium text-slate-700">{user?.name}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Main Content ──────────────────────────────────────── */}
          <main className="flex-1 w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h1 className="text-[19px] font-bold tracking-tight text-slate-900 leading-tight">
                  {pageTitle}
                </h1>
                {pageSubtitle && (
                  <p className="mt-0.5 text-[12px] text-slate-400">{pageSubtitle}</p>
                )}
              </div>
              {action && <div className="shrink-0">{action}</div>}
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
