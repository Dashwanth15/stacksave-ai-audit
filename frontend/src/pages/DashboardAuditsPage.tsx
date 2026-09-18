// ============================================================
// DashboardAuditsPage — My Saved Audits List
// Displays ONLY explicitly saved audits (isSaved: true) belonging to the user
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { fetchUserAudits, deleteUserAudit } from '../services/api';
import type { SavedAuditSummary } from '../types';

export default function DashboardAuditsPage() {
  const { authenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [audits, setAudits] = useState<SavedAuditSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [auditToDelete, setAuditToDelete] = useState<SavedAuditSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (!authLoading && !authenticated) {
      navigate('/');
    }
  }, [authLoading, authenticated, navigate]);

  useEffect(() => {
    let isMounted = true;
    if (!authenticated) return;

    setLoading(true);
    fetchUserAudits()
      .then((data) => {
        if (isMounted) {
          setAudits(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || 'Failed to load saved audits.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [authenticated]);

  const handleDeleteConfirm = async () => {
    if (!auditToDelete) return;
    try {
      setIsDeleting(true);
      await deleteUserAudit(auditToDelete.auditId);
      setAudits((prev) => prev.filter((a) => a.auditId !== auditToDelete.auditId));
      setAuditToDelete(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete audit.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout
      activeTab="audits"
      pageTitle="My Audits"
      pageSubtitle="Your saved AI spend audits"
      action={
        <button
          onClick={() => navigate('/audit')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white cursor-pointer transition-all duration-150"
          style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #264d7a 100%)',
            boxShadow: '0 2px 8px rgba(30,58,95,0.35)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 4px 14px rgba(30,58,95,0.45)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 2px 8px rgba(30,58,95,0.35)';
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Run an Audit
        </button>
      }
    >
      {/* ── Loading ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-white animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center justify-between p-4 rounded-xl border border-red-200 bg-red-50 text-[13px] text-red-700">
          <span>{error}</span>
          <button
            onClick={() => window.location.reload()}
            className="ml-4 px-3 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-semibold cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      ) : audits.length === 0 ? (
        /* ── Empty state ─────────────────────────────────────── */
        <div
          className="rounded-xl border border-slate-200 bg-white px-6 py-8 flex flex-col sm:flex-row sm:items-center gap-4"
          style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] font-bold text-slate-900">No saved audits</h2>
            <p className="mt-0.5 text-[12px] text-slate-500 leading-relaxed max-w-sm">
              Run an audit and save it to start building your StackSave history, tracking rate changes, and comparing stacks.
            </p>
          </div>
          <button
            onClick={() => navigate('/audit')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold text-white cursor-pointer transition-all duration-150 shrink-0"
            style={{
              background: 'linear-gradient(135deg, #1e3a5f 0%, #264d7a 100%)',
              boxShadow: '0 2px 8px rgba(30,58,95,0.3)',
            }}
          >
            Run an Audit
          </button>
        </div>
      ) : (
        /* ── Audit list ──────────────────────────────────────── */
        <div
          className="rounded-xl border border-slate-200 bg-white overflow-hidden"
          style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}
        >
          {/* Section header */}
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
            <div className="w-1 h-4 rounded-full bg-indigo-400" />
            <h2 className="text-[13px] font-bold text-slate-800">
              All Audits
              <span className="ml-2 text-[11px] font-normal text-slate-400">({audits.length})</span>
            </h2>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-2 bg-slate-50 border-b border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Audit</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right w-20">Platforms</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right w-14">Team</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right w-24">Spend</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right w-24">Savings</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right w-28">Actions</span>
          </div>

          <div className="divide-y divide-slate-100">
            {audits.map((item) => {
              const dateStr = item.createdAt
                ? new Date(item.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recent';

              return (
                <div
                  key={item.auditId}
                  className="group grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3.5 items-center hover:bg-slate-50 transition-colors duration-150"
                >
                  {/* Audit name + date */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-slate-800 truncate">
                        {item.companyName || 'Audit'}
                      </span>
                      {item.isAlreadyOptimal && (
                        <span className="text-[10px] text-slate-400 font-medium italic shrink-0">
                          optimal
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">{dateStr}</span>
                  </div>

                  {/* Platforms */}
                  <span className="text-[12px] text-slate-600 text-right w-20 tabular-nums">{item.platformCount}</span>

                  {/* Team */}
                  <span className="text-[12px] text-slate-600 text-right w-14 tabular-nums">{item.teamSize}</span>

                  {/* Current spend */}
                  <span className="text-[12px] text-slate-600 text-right w-24 tabular-nums">
                    ${Math.round(item.totalMonthlySpend)}/mo
                  </span>

                  {/* Savings — emerald accent */}
                  <span className="text-[13px] font-bold text-emerald-700 text-right w-24 tabular-nums">
                    ${Math.round(item.estimatedMonthlySavings)}/mo
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end w-28">
                    <button
                      onClick={() => navigate(`/audit/${item.auditId}`)}
                      className="h-7 px-3 rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-slate-600 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900 transition-colors duration-150 cursor-pointer"
                    >
                      View
                    </button>
                    <button
                      onClick={() => navigate(`/audit/${item.auditId}/diff`)}
                      className="h-7 px-3 rounded-md border border-indigo-200 bg-indigo-50 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors duration-150 cursor-pointer"
                    >
                      Diff
                    </button>
                    <button
                      onClick={() => setAuditToDelete(item)}
                      className="h-7 w-7 rounded-md flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors duration-150 cursor-pointer"
                      title="Delete audit"
                      aria-label="Delete audit"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ─────────────────────────── */}
      {auditToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 border border-slate-200"
            style={{ boxShadow: '0 20px 50px rgba(15,23,42,0.15)' }}
          >
            <h3 className="text-[15px] font-bold text-slate-900">Remove this audit?</h3>
            <p className="mt-1.5 text-[12px] text-slate-500 leading-relaxed">
              This audit will be permanently removed from your account and dashboard.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setAuditToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-semibold cursor-pointer transition-colors duration-150"
                style={{ boxShadow: '0 1px 4px rgba(220,38,38,0.3)' }}
              >
                {isDeleting ? 'Removing…' : 'Remove Audit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
