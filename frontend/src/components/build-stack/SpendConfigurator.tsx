// ============================================================
// SpendConfigurator — Step 2 of the wizard.
// Turns "team size" and "monthly budget" into one connected spend
// decision: seats × per-seat = monthly spend, shown live in the
// procurement-data (mono) voice.
//
// Contract: this component only reads/sets teamSize, noBudget, and
// budget. It never reshapes them — the page still sends
// monthlyBudget = noBudget ? null : budget exactly as before.
// ============================================================

const SEAT_PRESETS = [1, 5, 15, 50, 100, 250] as const;
const SLIDER_MAX = 5000;
const NAVY = '#1E3A5F';

interface SpendConfiguratorProps {
  teamSize: number;
  setTeamSize: (n: number) => void;
  noBudget: boolean;
  setNoBudget: (b: boolean) => void;
  budget: number;
  setBudget: (n: number) => void;
}

export default function SpendConfigurator({
  teamSize,
  setTeamSize,
  noBudget,
  setNoBudget,
  budget,
  setBudget,
}: SpendConfiguratorProps) {
  const perSeat = noBudget ? null : Math.round(budget / Math.max(1, teamSize));
  const dots = Math.min(teamSize, 10);
  const overflow = Math.max(0, teamSize - 10);

  return (
    <div className="space-y-8">
      {/* ── Team scale ─────────────────────────────────────── */}
      <section className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1.5">
          <div>
            <h2 className="text-base sm:text-lg font-black uppercase tracking-[0.05em] text-slate-950">
              Team Scale
            </h2>
            <p className="text-[13.5px] sm:text-sm text-slate-700 font-semibold mt-0.5">
              How many people will actively use these AI tools?
            </p>
          </div>
          <span className="font-mono-financial text-sm font-black text-slate-950 bg-slate-100 px-3.5 py-1.5 rounded-lg border-2 border-slate-300 shadow-xs">
            {teamSize.toLocaleString()} {teamSize === 1 ? 'person' : 'people'}
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          {SEAT_PRESETS.map((n) => {
            const active = teamSize === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setTeamSize(n)}
                style={active ? { borderColor: NAVY, backgroundColor: 'rgba(30,58,95,0.08)' } : undefined}
                className={`py-3.5 px-2 rounded-xl border-2 text-center transition-all duration-200 ease-out cursor-pointer ${active
                  ? 'border-[#1E3A5F] text-[#1E3A5F] shadow-sm font-black -translate-y-0.5 ring-2 ring-[#1E3A5F]/20'
                  : 'bg-white border-slate-300 text-slate-950 font-black hover:border-slate-500 hover:bg-slate-50 hover:shadow-xs'
                  }`}
              >
                <span className="font-mono-financial text-lg sm:text-xl font-black block leading-tight text-slate-950">
                  {n}{n === 250 ? '+' : ''}
                </span>
                <span className="block text-xs font-bold text-slate-700 mt-1 uppercase tracking-wide">
                  {n === 1 ? 'person' : 'people'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white border-2 border-slate-300 shadow-xs mt-2">
          <label className="flex items-center gap-3 text-sm sm:text-base font-extrabold text-slate-950">
            <span>Custom user count:</span>
            <input
              type="number"
              min={1}
              max={10000}
              value={teamSize}
              onChange={(e) => setTeamSize(Math.max(1, Math.min(10000, Number(e.target.value) || 1)))}
              className="w-32 px-3.5 py-1.5 text-lg font-black font-mono-financial text-slate-950 bg-slate-50 border-2 border-slate-400 rounded-lg focus:outline-none focus:border-[#1E3A5F] focus:bg-white focus:ring-[3px] focus:ring-[rgba(30,58,95,0.15)] shadow-xs"
            />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">active users</span>
          </label>

          {/* Seat visualization — literal for small teams, summarized for large */}
          <div className="flex items-center gap-2" aria-hidden="true">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: dots }).map((_, i) => (
                <span key={i} className="w-2.5 h-2.5 rounded-full bg-[#1E3A5F]" />
              ))}
            </div>
            {overflow > 0 && (
              <span className="font-mono-financial text-xs font-black text-[#1E3A5F] bg-[#1E3A5F]/10 px-2.5 py-1 rounded-md border border-[#1E3A5F]/20">
                +{overflow.toLocaleString()} more
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── Budget mode + amount ───────────────────────────── */}
      <section className="space-y-4 pt-6 border-t-2 border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black uppercase tracking-[0.05em] text-slate-950">
              Monthly Team Budget
            </h2>
            <p className="text-[13.5px] sm:text-sm text-slate-700 font-semibold mt-0.5">
              Maximum amount you're comfortable spending across the entire team each month
            </p>
          </div>

          {/* Segmented control — a labeled binary choice, not a hidden switch */}
          <div className="inline-flex rounded-xl bg-slate-200/90 p-1 self-start border-2 border-slate-300 shadow-xs">
            <button
              type="button"
              onClick={() => setNoBudget(false)}
              aria-pressed={!noBudget}
              className={`px-4.5 py-2 rounded-lg text-xs font-black transition-all duration-200 ease-out cursor-pointer ${!noBudget ? 'bg-white text-[#1E3A5F] shadow-sm border border-slate-200 font-black' : 'text-slate-700 hover:text-slate-950'
                }`}
            >
              Set a budget
            </button>
            <button
              type="button"
              onClick={() => setNoBudget(true)}
              aria-pressed={noBudget}
              className={`px-4.5 py-2 rounded-lg text-xs font-black transition-all duration-200 ease-out cursor-pointer ${noBudget ? 'bg-white text-[#1E3A5F] shadow-sm border border-slate-200 font-black' : 'text-slate-700 hover:text-slate-950'
                }`}
            >
              No ceiling
            </button>
          </div>
        </div>

        {noBudget ? (
          <div className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-6 shadow-xs">
            <div className="flex items-center gap-2 text-base font-black text-slate-950">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              Unconstrained Procurement
            </div>
            <p className="mt-1.5 text-sm text-slate-700 font-medium leading-relaxed">
              No spend ceiling. The engine ranks the strongest stack for your domain and
              capabilities, then reports what it costs.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-slate-300 bg-white p-6 sm:p-7 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
              <div>
                <span className="block text-xs font-black uppercase tracking-[0.08em] text-slate-700 mb-1.5">
                  Total Monthly Team Ceiling
                </span>
                <label className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold text-slate-500">$</span>
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    step={25}
                    value={budget}
                    onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))}
                    aria-label="Monthly budget in dollars"
                    className="w-44 bg-transparent text-4xl sm:text-5xl font-black font-mono-financial tracking-tight text-slate-950 focus:outline-none border-b-2 border-slate-400 focus:border-[#1E3A5F] transition-colors pb-0.5"
                  />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700">/mo team total</span>
                </label>
              </div>

              {perSeat !== null && (
                <div className="sm:text-right bg-slate-100 border-2 border-slate-300 rounded-xl px-5 py-4 shadow-xs min-w-[220px]">
                  <span className="block text-[11px] font-black uppercase tracking-[0.08em] text-slate-700">
                    Target per person
                  </span>
                  <span className="font-mono-financial text-xl sm:text-2xl font-black text-slate-950 block mt-1">
                    ~${perSeat.toLocaleString()} <span className="text-xs font-bold text-slate-700">/ user / mo</span>
                  </span>
                </div>
              )}
            </div>

            <div className="pt-3">
              <input
                type="range"
                min={0}
                max={SLIDER_MAX}
                step={25}
                value={Math.min(budget, SLIDER_MAX)}
                onChange={(e) => setBudget(Number(e.target.value))}
                aria-label="Monthly budget slider"
                className="w-full h-3 bg-slate-300 rounded-full appearance-none cursor-pointer accent-[#1E3A5F] hover:bg-slate-400 transition-colors"
              />
              <div className="flex justify-between font-mono-financial text-xs sm:text-sm font-black text-slate-800 pt-2">
                <span>$0</span>
                <span>$1.5k</span>
                <span>$3k</span>
                <span>$5k+</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Live spend equation ─────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border-2 border-[#1E3A5F]/25 bg-[#1E3A5F]/[0.05] px-6 py-4.5 font-mono-financial text-base sm:text-lg font-bold text-slate-950 shadow-xs">
          <span className="font-black text-slate-950 text-base sm:text-lg">{teamSize.toLocaleString()} {teamSize === 1 ? 'person' : 'people'}</span>
          {noBudget ? (
            <>
              <span className="text-slate-400">·</span>
              <span className="text-slate-800 font-bold">unconstrained procurement</span>
            </>
          ) : (
            <>
              <span className="text-slate-400">×</span>
              <span className="text-slate-800 font-bold">~${(perSeat ?? 0).toLocaleString()}/person</span>
              <span className="text-slate-400">=</span>
              <span className="font-black text-[#1E3A5F] text-lg sm:text-xl">${budget.toLocaleString()}/mo total spend</span>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
