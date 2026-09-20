import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Inbox } from 'lucide-react';
import { DUR, EASE } from './tokens';
import { useCountUp, usePrefersReducedMotion } from './hooks';

/* ---------- page transition: subtle fade + 6px rise, never blocks nav ---------- */
export function PageFade({ k, children }) {
  const reduce = usePrefersReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      key={k}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.page, ease: EASE.out }}>
      {children}
    </motion.div>
  );
}

/* ---------- modal + drawer shells (200–300ms, reversible) ---------- */
export function ModalShell({ open, onClose, children, label }) {
  const reduce = usePrefersReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label={label || 'Dialog'}>
          <div className="absolute inset-0 bg-black/45" onClick={onClose} />
          <motion.div
            className="relative"
            initial={reduce ? false : { opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: DUR.modal, ease: EASE.out }}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function DrawerShell({ open, onClose, side = 'left', children, label }) {
  const reduce = usePrefersReducedMotion();
  const x = side === 'left' ? '-100%' : '100%';
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={label || 'Panel'}>
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.22 }}
            onClick={onClose}
          />
          <motion.div
            className={`absolute inset-y-0 ${side === 'left' ? 'left-0' : 'right-0'}`}
            initial={reduce ? false : { x }}
            animate={{ x: 0 }}
            exit={reduce ? { opacity: 0 } : { x }}
            transition={{ duration: 0.26, ease: EASE.out }}>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ---------- tabs with sliding indicator ---------- */
export function SlideTabs({ tabs, value, onChange }) {
  return (
    <div className="flex items-center gap-1 border-b border-gray-200" role="tablist">
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={`relative pb-3 px-4 text-sm font-semibold transition-colors duration-200 ${
              active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'
            }`}>
            {t.label}
            {active && (
              <motion.span
                layoutId="cc-tab-ink"
                className="absolute left-2 right-2 -bottom-px h-0.5 bg-blue-600 rounded-full"
                transition={{ duration: 0.22, ease: EASE.out }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- progress steps with animated connector ---------- */
export function ProgressSteps({ steps, current }) {
  return (
    <ol className="flex items-center gap-0" aria-label="Progress">
      {steps.map((s, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li key={s} className="flex items-center last:flex-none flex-1">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-200 ${
                done ? 'bg-blue-600 text-white' : now ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300' : 'bg-gray-200 text-gray-500'
              }`}>
              {done ? '✓' : i + 1}
            </span>
            {i < steps.length - 1 && (
              <span className="flex-1 h-0.5 mx-1 bg-gray-200 rounded overflow-hidden">
                <motion.span
                  className="block h-full bg-blue-600 origin-left"
                  initial={false}
                  animate={{ scaleX: done ? 1 : 0 }}
                  transition={{ duration: 0.25, ease: EASE.out }}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- skeletons (subtle shimmer, no spinners for content) ---------- */
export const Skel = ({ className = '', style }) => (
  <div className={`cc-skeleton rounded-md ${className}`} style={style} aria-hidden="true" />
);

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
      <Skel className="h-5 w-2/3" />
      <Skel className="h-4 w-full" />
      <Skel className="h-4 w-5/6" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skel key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

/* ---------- state views (animated entrance, layout preserved by caller) ---------- */
export function ErrorState({ title = 'Something went wrong', body = "We couldn't load this data.", onRetry }) {
  return (
    <div className="cc-enter bg-white rounded-xl border border-red-100 p-8 text-center max-w-md mx-auto">
      <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1 mb-4">{body}</p>
      {onRetry && (
        <button onClick={onRetry} className="cc-btn px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg">
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }) {
  return (
    <div className="cc-enter bg-white rounded-xl border border-gray-100 p-10 text-center max-w-md mx-auto">
      <div className="text-gray-300 flex justify-center mb-3">{icon || <Inbox className="w-10 h-10" />}</div>
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {body && <p className="text-sm text-gray-500 mt-1 mb-4">{body}</p>}
      {action}
    </div>
  );
}

/* ---------- count-up (backend values only; callers pass real numbers) ---------- */
export function CountUp({ value, format, duration }) {
  const v = useCountUp(value, duration);
  const text = format ? format(v) : Math.round(v).toLocaleString('en-IN');
  return <span>{text}</span>;
}

/* ---------- matching flow viz (real states only: props drive nodes) ---------- */
const FLOW_STAGES = ['Request', 'Factors', 'Ranked', 'Review', 'Allocated'];
export function MatchFlow({ stage = 0 }) {
  return (
    <div className="flex items-center justify-between gap-1 py-2" aria-label="Matching progress">
      {FLOW_STAGES.map((s, i) => (
        <div key={s} className="flex items-center gap-1 flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-200 ${
                i < stage ? 'bg-emerald-500 text-white' : i === stage ? 'bg-indigo-600 text-white cc-node-pulse' : 'bg-gray-200 text-gray-500'
              }`}>
              {i < stage ? '✓' : i + 1}
            </span>
            <span className="text-[10px] text-gray-500 font-medium hidden sm:block">{s}</span>
          </div>
          {i < FLOW_STAGES.length - 1 && (
            <svg className="flex-1 h-4 -mt-5" preserveAspectRatio="none" viewBox="0 0 40 4">
              <line x1="0" y1="2" x2="40" y2="2" stroke={i < stage ? '#10b981' : '#c7d2fe'} strokeWidth="2" className={i === stage ? 'cc-flow-line' : undefined} />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}
