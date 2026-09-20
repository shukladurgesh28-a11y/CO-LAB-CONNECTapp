import { Link } from 'react-router-dom';
import { CountUp } from '../motion/primitives';

/* eslint-disable react/prop-types */

/** Hero header: eyebrow + title + sub + optional CTA + optional stats strip. */
export function PageHero({ eyebrow, title, sub, cta, stats, tone = 'brand' }) {
  const tones = {
    brand: 'from-[#1e1b4b] via-[#2b2580] to-[#4f46e5]',
    emerald: 'from-[#06392f] via-[#046c4e] to-[#10b981]',
    blue: 'from-[#0b2447] via-[#1d4ed8] to-[#38bdf8]',
    violet: 'from-[#2e1065] via-[#6d28d9] to-[#a78bfa]',
    slate: 'from-[#020617] via-[#1e293b] to-[#334155]',
  };
  return (
    <section className={`cc-enter relative overflow-hidden rounded-2xl bg-gradient-to-br ${tones[tone]} text-white p-6 sm:p-8 shadow-lg`}>
      <div className="absolute -right-16 -top-24 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute right-24 -bottom-28 w-80 h-80 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      <div className="relative">
        {eyebrow && <p className="cc-eyebrow text-white/70">{eyebrow}</p>}
        <h1 className="cc-h-display mt-1">{title}</h1>
        {sub && <p className="text-white/75 text-sm mt-2 max-w-xl">{sub}</p>}
        {cta && (
          <div className="mt-5 flex flex-wrap gap-3">
            {cta.map((c) => (
              <Link
                key={c.to}
                to={c.to}
                className="cc-btn inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 font-semibold rounded-xl text-sm shadow"
              >
                {c.icon}{c.label}
              </Link>
            ))}
          </div>
        )}
        {stats && stats.length > 0 && (
          <dl className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl px-4 py-3 backdrop-blur-md">
                <dt className="text-[11px] uppercase tracking-wider text-white/65">{s.label}</dt>
                <dd className="text-xl font-extrabold">
                  {typeof s.value === 'number' ? <CountUp value={s.value} format={s.format} /> : s.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

/** KPI tile with backend-driven count-up. value must be a number (or preformatted string). */
export function StatTile({ icon, label, value, sub, money }) {
  return (
    <div className="cc-glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
        {icon}
      </div>
      <p className="text-2xl font-extrabold text-gray-900 mt-1">
        {typeof value === 'number' ? (
          <CountUp value={value} format={money ? (v) => `₹${Math.round(v).toLocaleString('en-IN')}` : undefined} />
        ) : (
          value
        )}
      </p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export function SectionCard({ title, sub, action, children, className = '' }) {
  return (
    <section className={`cc-glass rounded-2xl p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="cc-h-section text-gray-900">{title}</h2>
            {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Avatar({ name, size = 'md' }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const dims = size === 'lg' ? 'w-14 h-14 text-lg' : 'w-9 h-9 text-xs';
  return (
    <span className={`${dims} rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold flex items-center justify-center shrink-0`} aria-hidden="true">
      {initials}
    </span>
  );
}

/** Booking/request lifecycle timeline driven by real status. */
const FLOW = ['pending', 'confirmed', 'accepted', 'en_route', 'service_started', 'completed'];
const FLOW_LABELS = { pending: 'Requested', confirmed: 'Confirmed', accepted: 'Accepted', en_route: 'En route', service_started: 'In service', completed: 'Completed' };

export function StatusTimeline({ status }) {
  if (status === 'cancelled' || status === 'rejected') {
    return (
      <div className="flex items-center gap-2 text-sm font-semibold text-red-600">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
        {status === 'cancelled' ? 'Cancelled' : 'Declined by worker'}
      </div>
    );
  }
  const idx = Math.max(0, FLOW.indexOf(status));
  return (
    <ol className="flex items-center" aria-label="Booking progress">
      {FLOW.map((s, i) => (
        <li key={s} className="flex items-center last:flex-none flex-1 min-w-0">
          <span className="flex flex-col items-center gap-1 shrink-0" title={FLOW_LABELS[s]}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors duration-200 ${i <= idx ? 'text-white' : 'bg-gray-200 text-gray-400'}`}
              style={i <= idx ? { background: 'var(--cc-accent, #4f46e5)' } : undefined}>
              {i <= idx ? '✓' : i + 1}
            </span>
            <span className="text-[10px] text-gray-500 hidden sm:block">{FLOW_LABELS[s]}</span>
          </span>
          {i < FLOW.length - 1 && <span className={`flex-1 h-0.5 mx-1 rounded transition-colors duration-300 ${i < idx ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
        </li>
      ))}
    </ol>
  );
}

/** Responsive data table → horizontal scroll with sticky first col on mobile. */
export function DataTable({ columns, rows, rowKey, empty = 'No records yet.' }) {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">{empty}</p>;
  }
  return (
    <div className="cc-table-scroll -mx-1 px-1">
      <table className="w-full text-left text-xs text-gray-600">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
            {columns.map((c) => (
              <th key={c.key} className="py-2.5 px-3 font-semibold whitespace-nowrap">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={rowKey(r)} className="hover:bg-indigo-50/40 transition-colors">
              {columns.map((c) => (
                <td key={c.key} className="py-2.5 px-3 whitespace-nowrap">{c.render ? c.render(r) : r[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const inr = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export function safeDate(v, opts) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', opts);
}
