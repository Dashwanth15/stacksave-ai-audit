// ============================================================
// DashboardStackPage — My Saved AI Stack
// Clean foundation integrated with Build My Stack
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { fetchUserStack } from '../services/api';
import type { SavedUserStack } from '../types';
import { setUserSessionItem } from '../utils/userSession';

function formatPriority(priority?: string): string | null {
  if (!priority) return null;
  const p = priority.trim().toUpperCase();
  if (p.includes('PRIMARY') || p === '01 PRIMARY') return '01 · Primary';
  if (p.includes('SECONDARY') || p === '02 SECONDARY') return '02 · Secondary';
  if (p.includes('OPTIONAL') || p === '03 OPTIONAL') return '03 · Optional';
  if (p.includes('API') || p === '04 API LAYER') return '04 · API Layer';
  return priority;
}

export default function DashboardStackPage() {
  const { authenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [stack, setStack] = useState<SavedUserStack | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!authLoading && !authenticated) {
      navigate('/');
    }
  }, [authLoading, authenticated, navigate]);

  useEffect(() => {
    let isMounted = true;
    if (!authenticated) return;

    setLoading(true);
    fetchUserStack()
      .then((data) => {
        if (isMounted) {
          setStack(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [authenticated]);

  const handleViewResults = () => {
    if (stack?.recommendation) {
      try {
        setUserSessionItem('stackRecommendation', JSON.stringify(stack.recommendation));
      } catch {
        // ignore storage error
      }
    }
    navigate('/build-stack/results');
  };

  const dateStr = stack?.updatedAt
    ? new Date(stack.updatedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <DashboardLayout
      activeTab="stack"
      pageTitle="My AI Stack"
      pageSubtitle="Your persistent production AI tooling configuration"
      action={
        <div className="flex items-center gap-2.5">
          {stack && stack.tools && stack.tools.length > 0 && (
            <button
              onClick={handleViewResults}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-[13px] font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>View Results</span>
            </button>
          )}
          <button
            onClick={() => navigate('/build-stack')}
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
            <span>{stack && stack.tools && stack.tools.length > 0 ? 'Reconfigure Stack' : 'Build AI Stack'}</span>
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="h-48 rounded-xl bg-white animate-pulse border border-slate-200" />
      ) : stack && stack.tools && stack.tools.length > 0 ? (
        <div className="space-y-6">
          <div
            className="rounded-xl border border-slate-200 bg-white p-6"
            style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b border-slate-100 mb-1 gap-4">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">
                    {stack.name || 'Primary AI Stack'}
                  </h2>
                  {dateStr && (
                    <span className="text-[11.5px] text-slate-400 font-normal">
                      · Saved {dateStr}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-slate-500 mt-1 capitalize">
                  Workflow Domain: <span className="font-medium text-slate-700">{stack.domain ? stack.domain.replace(/-/g, ' ') : 'General'}</span>
                </p>
              </div>
              <div className="sm:text-right shrink-0">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-0.5">
                  Total Monthly Cost
                </span>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 font-mono-financial tabular-nums">
                  ${Math.round(stack.totalMonthlySpend || 0)}
                  <span className="text-xs font-normal text-slate-400 ml-0.5">/mo</span>
                </p>
              </div>
            </div>

            {/* Platform rows */}
            <div className="divide-y divide-slate-100">
              {stack.tools.map((tool: any, idx: number) => {
                const toolName = tool.name || tool.toolName || tool.toolId;
                const toolPlan = tool.plan || tool.recommendedPlan;
                const toolCost = typeof tool.monthlyCost === 'number'
                  ? tool.monthlyCost
                  : typeof tool.estimatedMonthlyCostPerTeam === 'number'
                  ? tool.estimatedMonthlyCostPerTeam
                  : (tool.monthlyCostPerSeat || 0);

                const formattedPriority = formatPriority(tool.buyingPriority);

                return (
                  <div
                    key={idx}
                    className="py-3.5 sm:py-4 flex items-center justify-between text-xs hover:bg-slate-50/60 -mx-6 px-6 transition-colors duration-150"
                  >
                    <div className="min-w-0 pr-4">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[14px] font-semibold text-slate-900">
                          {toolName}
                        </span>
                        {toolPlan && (
                          <span className="text-[12px] font-normal text-slate-400">
                            {toolPlan}
                          </span>
                        )}
                        {formattedPriority && (
                          <span className="text-[11.5px] font-medium text-slate-400">
                            · {formattedPriority}
                          </span>
                        )}
                      </div>
                      {tool.vendor && tool.vendor.toLowerCase() !== toolName.toLowerCase() && (
                        <span className="text-[11.5px] text-slate-400 block mt-0.5">
                          by {tool.vendor}
                        </span>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="font-semibold text-slate-900 font-mono-financial text-[14px] tabular-nums">
                        ${Math.round(toolCost)}
                        <span className="text-[11px] font-normal text-slate-400">/mo</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Card Footer / Bottom Right View Action */}
            <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <span className="text-[12px] text-slate-400 font-medium">
                {stack.tools.length} platform{stack.tools.length === 1 ? '' : 's'} in stack
              </span>
              <button
                onClick={handleViewResults}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[12.5px] font-semibold transition-all duration-150 cursor-pointer shadow-xs group ml-auto"
                title="View full results and intelligence dashboard"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>View Results & History</span>
                <span className="text-slate-300 group-hover:text-white group-hover:translate-x-0.5 transition-all text-[13px] font-bold">→</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="rounded-xl border border-slate-200 bg-white p-10 text-center max-w-lg mx-auto"
          style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">
            No saved stack yet
          </h2>
          <p className="mt-1.5 text-[12px] text-slate-500 leading-relaxed max-w-sm mx-auto">
            Use the Build My Stack tool to configure an optimal multi-model AI stack based on your team's workflow, budget constraints, and compliance requirements.
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/build-stack')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold text-white cursor-pointer transition-all duration-150"
              style={{
                background: 'linear-gradient(135deg, #1e3a5f 0%, #264d7a 100%)',
                boxShadow: '0 2px 8px rgba(30,58,95,0.3)',
              }}
            >
              <span>Build My AI Stack</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
