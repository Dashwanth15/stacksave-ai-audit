// ============================================================
// PolicyToggle — an accessible policy switch for the governance
// controls in Step 4. Proper role="switch" + aria-checked, keyboard
// operable, emerald when on.
//
// `locked` renders the switch as enforced-on (e.g. Zero Data
// Retention when the Enterprise Security strategy is selected). The
// lock is purely presentational — it never mutates the underlying
// preference; the request payload derives that value on its own.
// ============================================================

interface PolicyToggleProps {
  checked: boolean;
  onChange: () => void;
  title: string;
  description?: string;
  locked?: boolean;
  lockedLabel?: string;
}

export default function PolicyToggle({
  checked,
  onChange,
  title,
  description,
  locked = false,
  lockedLabel = 'Enforced by strategy',
}: PolicyToggleProps) {
  const on = checked || locked;

  return (
    <label
      className={`flex items-center justify-between gap-4 rounded-xl border-2 p-4.5 sm:p-5 transition-all duration-200 ease-out
        ${locked
          ? 'bg-emerald-50/80 border-emerald-500 cursor-default shadow-xs'
          : on
            ? 'bg-emerald-50/50 border-emerald-500 shadow-xs cursor-pointer'
            : 'bg-white border-slate-300 hover:border-slate-400 hover:shadow-xs cursor-pointer'
        }`}
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2.5">
          <span className="text-base font-black text-slate-950 leading-snug">{title}</span>
          {locked && (
            <span className="text-[10.5px] font-black uppercase tracking-[0.08em] text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-300">
              {lockedLabel}
            </span>
          )}
        </span>
        {description && (
          <span className="mt-1 block text-sm leading-relaxed text-slate-700 font-semibold">{description}</span>
        )}
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={title}
        disabled={locked}
        onClick={onChange}
        className={`relative shrink-0 w-12 h-6.5 rounded-full p-0.5 transition-colors duration-200 ease-out cursor-pointer
          ${on ? 'bg-emerald-600' : 'bg-slate-400'} ${locked ? 'opacity-90 cursor-default' : ''}`}
      >
        <span
          className={`block w-5.5 h-5.5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${on ? 'translate-x-5.5' : 'translate-x-0'
            }`}
        />
      </button>
    </label>
  );
}
