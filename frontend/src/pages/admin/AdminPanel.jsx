import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ShieldCheck, Loader2, LayoutDashboard, Network, Inbox, Sparkles, Building2,
  Users, Briefcase, GitBranch, Wallet, HeartHandshake, AlertTriangle, Wrench,
  BarChart3, Bell, ScrollText, Scan, ChevronRight, Activity, CircleDot,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import QRScannerModal from '../../components/QRScannerModal';
import AIAssistant from '../../components/AIAssistant';
import { CountUp } from '../../motion/primitives';
import { DUR, EASE } from '../../motion/tokens';
import { usePrefersReducedMotion } from '../../motion/hooks';

const inr = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
const CountNum = ({ value, money }) => (
  <CountUp value={Number(value || 0)} format={money ? (v) => inr(Math.round(v)) : undefined} />
);

const TABS = [
  'Overview', 'Organization', 'Users', 'Requests', 'AI Assistant', 'Federations', 'Societies', 'Workers', 'Workforce', 'Matching',
  'Payments', 'Welfare', 'Disputes', 'Services', 'Analytics', 'Notifications', 'Audit',
];

const TAB_ICONS = {
  Overview: LayoutDashboard, Organization: Network, Users: Users, Requests: Inbox, 'AI Assistant': Sparkles,
  Federations: Building2, Societies: Users, Workers: Briefcase, Workforce: Users, Matching: GitBranch,
  Payments: Wallet, Welfare: HeartHandshake, Disputes: AlertTriangle, Services: Wrench,
  Analytics: BarChart3, Notifications: Bell, Audit: ScrollText,
};

const ORG_RULES = [
  { n: '1', t: 'Federation sits on top', d: 'A federation oversees many societies (co-ops). It sees network-wide demand, workforce and revenue — and can lend workers across its societies when one is short (HR pool).' },
  { n: '2', t: 'Society = Co-op (same thing)', d: '“Society” and “Cooperative” are the same registry (cooperatives table). A society owns its verified workers, reviews customer requests in its area, and allocates jobs.' },
  { n: '3', t: 'Worker belongs to one society', d: 'Every worker row carries one cooperative_id. Verification, availability and workload are managed by that society.' },
  { n: '4', t: 'Request normally flows down, federation can lend sideways', d: 'Customer request → lands in one society → AI ranks that society’s workers → society (or worker direct-accept) allocates → booking. If that society is short, its federation can allocate a worker from another society in the same federation.' },
  { n: '5', t: 'Money is computed once, server-side', d: 'Commission 10% + welfare 2% on every job. Worker payout = total − commission − welfare. The panel only displays backend numbers.' },
  { n: '6', t: 'One panel, three manager views', d: 'Platform admin sees everything. Federation managers see their societies and can lend. Society managers see their workers and queue. Same tabs, scoped data.' },
];

const ROLE_BADGE = {
  platform_admin: 'Platform admin — full access',
  federation_admin: 'Federation manager — network view',
  cooperative_admin: 'Society (Co-op) manager — own workforce',
};

/* ---------- status pills (colored by meaning, not grey) ---------- */
const PILL = {
  pending: 'bg-amber-100 text-amber-800', reviewing: 'bg-blue-100 text-blue-800',
  recommended: 'bg-violet-100 text-violet-800', allocated: 'bg-indigo-100 text-indigo-800',
  confirmed: 'bg-emerald-100 text-emerald-800', accepted: 'bg-emerald-100 text-emerald-800',
  en_route: 'bg-cyan-100 text-cyan-800', in_progress: 'bg-blue-100 text-blue-800',
  service_started: 'bg-blue-100 text-blue-800', completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800', rejected: 'bg-red-100 text-red-800',
  urgent: 'bg-red-100 text-red-800', open: 'bg-red-100 text-red-800',
  under_review: 'bg-amber-100 text-amber-800', awaiting_response: 'bg-amber-100 text-amber-800',
  resolved: 'bg-emerald-100 text-emerald-800', verified: 'bg-emerald-100 text-emerald-800',
  active: 'bg-emerald-100 text-emerald-800', paid: 'bg-emerald-100 text-emerald-800',
  expired: 'bg-gray-200 text-gray-600', suspended: 'bg-red-100 text-red-800',
};
const badge = (s) => {
  const k = String(s ?? '').toLowerCase();
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold capitalize ${PILL[k] || 'bg-gray-100 text-gray-600'}`}>
      <CircleDot size={9} className="opacity-60" />{String(s ?? '').replaceAll('_', ' ') || '—'}
    </span>
  );
};

const TabError = ({ message, onRetry }) => (
  <div className="bg-white rounded-2xl p-8 border border-red-100 shadow-sm text-center">
    <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
    <p className="text-sm text-red-700 font-medium">{message || 'Could not load this section.'}</p>
    <p className="text-xs text-gray-500 mt-1">Check that the backend is running, then retry.</p>
    {onRetry && (
      <button onClick={onRetry}
        className="mt-3 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-black transition">
        Retry
      </button>
    )}
  </div>
);

const KpiIcon = ({ icon: Icon, tone }) => (
  <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
    <Icon size={17} />
  </span>
);

const Card = ({ label, value, sub, icon: Icon, tone = 'bg-indigo-50 text-indigo-600' }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: EASE.out }}
    className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:shadow-md hover:border-slate-300 transition"
  >
    <div className="flex items-center gap-3">
      {Icon && <KpiIcon icon={Icon} tone={tone} />}
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
    </div>
    <div className="text-[22px] leading-7 font-black text-slate-900 mt-2 tabular-nums">{value}</div>
    {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
  </motion.div>
);

const Section = ({ title, sub, right, children, icon: Icon }) => (
  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.05)] overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/60">
      <div className="flex items-center gap-2.5">
        {Icon && <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center"><Icon size={15} /></span>}
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-[15px]">{title}</h3>
          {sub && <p className="text-xs text-slate-500">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
    <div className="p-4 sm:p-5">{children}</div>
  </div>
);

const Table = ({ head, children }) => (
  <div className="overflow-x-auto -mx-1 px-1">
    <table className="w-full text-left text-[13px] text-slate-600">
      <thead className="sticky top-0 bg-slate-50/95 backdrop-blur uppercase text-[10px] tracking-wider text-slate-400">
        <tr>{head.map((h) => <th key={h} className="py-2.5 px-3 font-bold whitespace-nowrap">{h}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  </div>
);

const btnPrimary = 'px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black disabled:opacity-50 transition shadow-sm';
const btnGhost = 'px-2.5 py-1.5 text-xs font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 transition';
const inputCls = 'px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition';

export default function AdminPanel() {
  const { user } = useAuth();
  const reduce = usePrefersReducedMotion();
  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [feds, setFeds] = useState([]);
  const [coops, setCoops] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [workerFilter, setWorkerFilter] = useState('all');
  const [workforce, setWorkforce] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [payments, setPayments] = useState(null);
  const [welfare, setWelfare] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [services, setServices] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [audit, setAudit] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loaded, setLoaded] = useState({});
  const [tabErrors, setTabErrors] = useState({});
  const [scannerOpen, setScannerOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const [broadcast, setBroadcast] = useState({ title: '', message: '', role: '' });
  const [allocatingReq, setAllocatingReq] = useState(null);
  const [allocWorker, setAllocWorker] = useState('');
  const [newCat, setNewCat] = useState({ name: '', slug: '', description: '' });
  const [newSvc, setNewSvc] = useState({ name: '', slug: '', category_id: '', base_price: '500' });
  const [allUsers, setAllUsers] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');

  const get = useCallback(async (url, params) => {
    const res = await api.get(url, { params });
    return res.data?.data ?? res.data;
  }, []);

  const loadTab = useCallback(async (name, force) => {
    if (loaded[name] && !force) return;
    try {
      if (name === 'Overview') setOverview(await get('/api/admin/overview'));
      if (name === 'Requests') setRequests(await get('/api/requests', { status: 'all' }));
      if (name === 'Federations') setFeds(await get('/api/admin/federations'));
      if (name === 'Societies') setCoops(await get('/api/admin/societies'));
      if (name === 'Workers') setWorkers(await get('/api/workers/'));
      if (name === 'Workforce') setWorkforce(await get('/api/federation/workforce/requirements'));
      if (name === 'Matching') setAllocations(await get('/api/admin/allocations'));
      if (name === 'Payments') setPayments(await get('/api/admin/payments'));
      if (name === 'Welfare') setWelfare(await get('/api/admin/welfare'));
      if (name === 'Disputes') setDisputes(await get('/api/disputes'));
      if (name === 'Services') setServices(await get('/api/services/'));
      if (name === 'Analytics') {
        const heat = await get('/api/analytics/heatmap');
        setHeatmap(heat?.points || heat || []);
      }
      if (name === 'Notifications') setNotifs(await get('/api/notifications'));
      if (name === 'Audit') setAudit(await get('/api/admin/audit-logs'));
      if (name === 'Users') {
        const data = await get('/api/admin/users', { limit: 500 });
        setAllUsers(Array.isArray(data) ? data : []);
      }
      setLoaded((p) => ({ ...p, [name]: true }));
      setTabErrors((p) => ({ ...p, [name]: null }));
    } catch (err) {
      const msg = err.userMessage || `Failed to load ${name}`;
      setTabErrors((p) => ({ ...p, [name]: msg }));
      toast.error(msg);
    }
  }, [get, loaded]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadTab('Overview');
      setLoading(false);
    })();
  }, []);

  useEffect(() => { loadTab(tab); }, [tab, loadTab]);
  useEffect(() => { if (tab === 'Organization') { loadTab('Federations'); } }, [tab, loadTab]);

  const mutate = async (key, fn, okMsg) => {
    setBusy(key);
    try {
      await fn();
      toast.success(okMsg);
      setLoaded((p) => ({ ...p, [tab]: false }));
      await loadTab(tab, true);
      setLoaded((p) => ({ ...p, Audit: false }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  const toggleFed = (f) => mutate(`fed-${f.id}`,
    () => api.patch(`/api/admin/federations/${f.id}`, { is_active: !f.is_active }),
    `Federation ${f.is_active ? 'deactivated' : 'activated'}`);
  const toggleCoop = (c) => mutate(`coop-${c.id}`,
    () => api.patch(`/api/admin/societies/${c.id}`, { is_active: !c.is_active }),
    `Society ${c.is_active ? 'deactivated' : 'activated'}`);
  const verifyWorker = (id, action) => mutate(`w-${id}`,
    () => api.post(`/cooperative/workers/verify/${id}`, { action }),
    `Worker ${action}d`);
  const resolveDispute = (id, status) => {
    const resolution = window.prompt(`Resolution note for dispute #${id}:`) || '';
    mutate(`d-${id}`, () => api.patch(`/api/disputes/${id}`, { status, resolution }), `Dispute ${status}`);
  };
  const toggleService = (s) => mutate(`svc-${s.id}`,
    () => api.patch(`/api/admin/services/${s.id}`, { is_active: !s.is_active }),
    `Service ${s.is_active ? 'deactivated' : 'activated'}`);
  const startAllocate = async (r) => {
    setAllocWorker('');
    setAllocatingReq(r.id);
    if (workers.length === 0) await loadTab('Workers', true);
  };
  const confirmAllocate = (requestId) => {
    const chosen = workers.find((w) => String(w.id) === String(allocWorker));
    return mutate(`alloc-req-${requestId}`,
      () => api.post('/api/allocations', { request_id: requestId, worker_id: Number(allocWorker) }),
      `Request #${requestId} allocated to ${chosen ? chosen.name : `worker #${allocWorker}`}. They will now see it in their panel.`).finally(() => {
      setAllocatingReq(null);
      setAllocWorker('');
    });
  };
  const sendBroadcast = () => mutate('broadcast',
    () => api.post('/api/admin/notifications/broadcast', broadcast), `Broadcast sent`);
  const createCategory = () => mutate('newcat',
    () => api.post('/api/admin/services/categories', newCat), 'Category created');
  const createService = () => mutate('newsvc',
    () => api.post('/api/admin/services', {
      ...newSvc, category_id: Number(newSvc.category_id), base_price: Number(newSvc.base_price),
    }), 'Service created');

  const shownWorkers = workers.filter((w) => {
    if (workerFilter === 'all') return true;
    if (workerFilter === 'verified') return w.verification_status === 'verified';
    if (workerFilter === 'pending') return w.verification_status === 'pending';
    if (workerFilter === 'suspended') return w.verification_status === 'suspended';
    return true;
  });

  const pendingReqCount = requests.filter((r) => r.status === 'pending').length;
  const openDisputes = disputes.filter((d) => ['open', 'under_review', 'awaiting_response'].includes(d.status)).length;
  const pendingWorkers = workers.filter((w) => w.verification_status === 'pending').length;
  const tabBadge = (t) => {
    if (t === 'Requests' && pendingReqCount > 0) return pendingReqCount;
    if (t === 'Workers' && pendingWorkers > 0) return pendingWorkers;
    if (t === 'Disputes' && openDisputes > 0) return openDisputes;
    return 0;
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto">
        <div className="h-36 rounded-3xl bg-slate-200/60 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-white border border-slate-200 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12 max-w-7xl mx-auto">
      {/* Command header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#1e1b4b] to-[#4c1d95] text-white shadow-xl">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-violet-500/20 blur-3xl rounded-full" />
          <div className="absolute -bottom-24 -left-16 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full" />
        </div>
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/10 rounded-full text-xs font-semibold text-violet-100">
                <ShieldCheck size={13} /> {ROLE_BADGE[user?.role] || 'Administration'}
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h1 className="text-2xl sm:text-[28px] font-black tracking-tight mt-2.5">
                Admin Panel{user?.name ? <span className="text-violet-200 font-bold"> — {user.name.split(' ')[0]}</span> : ''}
              </h1>
              <p className="text-violet-200/80 text-sm mt-1">Federations, societies (co-ops), workers, money, disputes — one console.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {pendingReqCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400/15 border border-amber-300/30 text-amber-200 text-xs font-bold">
                  <Activity size={13} /> {pendingReqCount} pending request{pendingReqCount > 1 ? 's' : ''}
                </span>
              )}
              <button onClick={() => setScannerOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-slate-900 text-xs font-extrabold rounded-xl hover:bg-violet-50 transition shadow-lg">
                <Scan size={14} /> Audit QR Scanner
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Icon tab bar */}
      <div className="sticky top-[57px] z-20 -mx-1 px-1 py-1.5 bg-[#f4f5fb]/90 backdrop-blur-md">
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Admin sections">
          {TABS.map((t) => {
            const Icon = TAB_ICONS[t] || CircleDot;
            const active = tab === t;
            const n = tabBadge(t);
            return (
              <button key={t} role="tab" aria-selected={active} onClick={() => setTab(t)}
                className={`relative shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${active ? 'text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-white'}`}>
                {active && !reduce && (
                  <motion.span layoutId="admin-tab-pill" className="absolute inset-0 bg-slate-900 rounded-xl shadow-md"
                    transition={{ type: 'spring', stiffness: 480, damping: 38 }} />
                )}
                {active && reduce && <span className="absolute inset-0 bg-slate-900 rounded-xl" />}
                <Icon size={13} className="relative" />
                <span className="relative">{t}</span>
                {n > 0 && (
                  <span className={`relative min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center ${active ? 'bg-white text-slate-900' : 'bg-red-500 text-white'}`}>{n}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: DUR.component, ease: EASE.out }}
        >
          {tabErrors[tab] && (
            <TabError message={tabErrors[tab]} onRetry={() => loadTab(tab, true)} />
          )}

          {tab === 'Overview' && !overview && !loading && !tabErrors.Overview && (
            <TabError message="Overview is empty." onRetry={() => loadTab('Overview', true)} />
          )}

          {tab === 'Overview' && overview && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <Card label="Federations" icon={Building2} tone="bg-violet-50 text-violet-600" value={<CountNum value={overview.federations_total} />} sub={`${overview.federations_active} active`} />
              <Card label="Societies" icon={Users} tone="bg-blue-50 text-blue-600" value={<CountNum value={overview.societies_total} />} sub={`${overview.societies_active} active`} />
              <Card label="Workers" icon={Briefcase} tone="bg-emerald-50 text-emerald-600" value={<CountNum value={overview.workers_total} />} sub={`${overview.workers_verified} verified`} />
              <Card label="Customers" icon={Users} tone="bg-cyan-50 text-cyan-600" value={<CountNum value={overview.customers_total} />} sub={`${overview.users_total} users`} />
              <Card label="Active jobs" icon={Activity} tone="bg-amber-50 text-amber-600" value={<CountNum value={overview.active_jobs} />} />
              <Card label="Workforce needs" icon={Users} tone="bg-slate-100 text-slate-600" value={<CountNum value={overview.workforce_requirements} />} />
              <Card label="Completed" icon={ShieldCheck} tone="bg-emerald-50 text-emerald-600" value={<CountNum value={overview.completed_jobs} />} />
              <Card label="Revenue" icon={Wallet} tone="bg-indigo-50 text-indigo-600" value={<CountNum value={overview.revenue_total} money />} sub={`Commission ₹${Number(overview.commission_total).toLocaleString('en-IN')}`} />
              <Card label="Payouts" icon={Wallet} tone="bg-teal-50 text-teal-600" value={<CountNum value={overview.payouts_total} money />} />
              <Card label="Welfare fund" icon={HeartHandshake} tone="bg-rose-50 text-rose-600" value={<CountNum value={overview.welfare_fund} money />} sub={`${overview.open_disputes} open disputes`} />
            </div>
          )}

          {tab === 'Organization' && (
            <div className="space-y-4">
              <Section title="How Federation › Society (Co-op) › Workers work" sub="One panel, three manager views" icon={Network}>
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  {['Federation', 'Society = Co-op', 'Workers'].map((s, i, arr) => (
                    <span key={s} className="flex items-center gap-2 text-xs font-bold">
                      <span className="px-3 py-1.5 rounded-xl bg-slate-900 text-white">{s}</span>
                      {i < arr.length - 1 && <ChevronRight size={13} className="text-slate-300" />}
                    </span>
                  ))}
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ORG_RULES.map((r) => (
                    <div key={r.n} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 hover:border-slate-300 hover:shadow-sm transition">
                      <p className="text-[11px] font-black text-indigo-600">RULE {r.n}</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">{r.t}</p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{r.d}</p>
                    </div>
                  ))}
                </div>
              </Section>
              <Section title="Live hierarchy" sub="From this database" icon={Building2}>
                <Table head={['Federation', 'Societies', 'Workers']}>
                  {(feds.length ? feds : [{ id: 0, name: 'All federations', society_count: overview?.societies_total, worker_count: overview?.workers_total }]).map((f) => (
                    <tr key={f.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-gray-900">{f.name}</td>
                      <td className="py-2.5 px-3 tabular-nums">{f.society_count ?? overview?.societies_total ?? '—'}</td>
                      <td className="py-2.5 px-3 tabular-nums">{f.worker_count ?? overview?.workers_total ?? '—'}</td>
                    </tr>
                  ))}
                </Table>
                <p className="text-[11px] text-gray-400 mt-2">Society = Cooperative (same registry). Workers carry one cooperative_id; requests land in one society.</p>
              </Section>
            </div>
          )}

          {tab === 'Users' && (() => {
            const filtered = allUsers.filter(u => {
              const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
              const q = userSearch.toLowerCase();
              const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q);
              return matchRole && matchSearch;
            });
            const roleCounts = allUsers.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {});
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card label="Total Users" icon={Users} tone="bg-indigo-50 text-indigo-600" value={allUsers.length} />
                  <Card label="Customers" icon={Users} tone="bg-cyan-50 text-cyan-600" value={roleCounts['customer'] || 0} />
                  <Card label="Workers" icon={Briefcase} tone="bg-emerald-50 text-emerald-600" value={roleCounts['worker'] || 0} />
                  <Card label="Verified" icon={ShieldCheck} tone="bg-violet-50 text-violet-600" value={allUsers.filter(u => u.is_verified).length} />
                </div>
                <Section
                  title="All registered users"
                  sub={`${filtered.length} of ${allUsers.length} users`}
                  icon={Users}
                  right={
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="Search name, email, phone…"
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        className={inputCls + ' text-xs w-44'}
                      />
                      <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}
                        className="text-xs font-bold border border-slate-200 rounded-xl px-2.5 py-2 bg-white">
                        <option value="all">All roles</option>
                        <option value="customer">Customers</option>
                        <option value="worker">Workers</option>
                        <option value="cooperative_admin">Co-op Admin</option>
                        <option value="federation_admin">Federation Admin</option>
                        <option value="platform_admin">Platform Admin</option>
                      </select>
                      <button onClick={() => loadTab('Users', true)} className={btnGhost}>↻ Refresh</button>
                    </div>
                  }
                >
                  <Table head={['ID', 'Name', 'Email', 'Phone', 'Role', 'Verified', 'Active', 'Joined']}>
                    {filtered.slice(0, 200).map(u => (
                      <tr key={u.id} className="hover:bg-indigo-50/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-400">#{u.id}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{u.name || '—'}</td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-[180px] truncate">{u.email || '—'}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{u.phone || '—'}</td>
                        <td className="py-2.5 px-3">{badge(u.role?.replace('_', ' '))}</td>
                        <td className="py-2.5 px-3">{u.is_verified ? <span className="text-emerald-600 font-bold text-xs">✓ Yes</span> : <span className="text-amber-600 font-bold text-xs">⚠ No</span>}</td>
                        <td className="py-2.5 px-3">{u.is_active ? badge('active') : badge('suspended')}</td>
                        <td className="py-2.5 px-3 text-slate-400 text-xs tabular-nums">{u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                      </tr>
                    ))}
                  </Table>
                  {filtered.length === 0 && !tabErrors.Users && (
                    <p className="text-sm text-slate-400 py-8 text-center">No users found{userSearch || userRoleFilter !== 'all' ? ' — try clearing the filter' : '. Users register via /register'}.</p>
                  )}
                  {filtered.length > 200 && <p className="text-xs text-slate-400 mt-2 text-center">Showing first 200 of {filtered.length} results.</p>}
                </Section>
              </div>
            );
          })()}

          {tab === 'Requests' && (

            <Section title="Service requests" sub={`${requests.length} across all societies`} icon={Inbox}
              right={pendingReqCount > 0 ? <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">{pendingReqCount} pending</span> : null}>
              <Table head={['ID', 'Service', 'Customer', 'Society', 'Status', 'Worker', 'Booking', 'Action']}>
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono">#{r.id}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900">{r.service_name || `#${r.service_id}`}</td>
                    <td className="py-2.5 px-3">{r.customer_name || `#${r.customer_id}`}</td>
                    <td className="py-2.5 px-3">{r.cooperative_name || `#${r.cooperative_id}`}</td>
                    <td className="py-2.5 px-3">{badge(r.status)}</td>
                    <td className="py-2.5 px-3">{r.allocated_worker?.name || (r.allocated_worker_id ? `#${r.allocated_worker_id}` : 'Unassigned')}</td>
                    <td className="py-2.5 px-3"><Link to={`/requests/${r.id}`} className="text-indigo-600 font-bold hover:underline">Open</Link>{r.booking_id ? <span className="text-gray-400"> · #{r.booking_id}</span> : ''}</td>
                    <td className="py-2.5 px-3">
                      {!r.allocated_worker_id && allocatingReq !== r.id && (
                        <button onClick={() => startAllocate(r)} className={btnPrimary}>Allocate</button>
                      )}
                      {!r.allocated_worker_id && allocatingReq === r.id && (
                        <span className="flex items-center gap-1">
                          <select value={allocWorker} onChange={(e) => setAllocWorker(e.target.value)}
                            className="text-xs border border-slate-200 rounded-xl px-1.5 py-1.5 max-w-[130px] bg-white">
                            <option value="">Worker…</option>
                            {workers
                              .filter((w) => w.cooperative_id === r.cooperative_id && w.verification_status === 'verified')
                              .map((w) => (
                                <option key={w.id} value={w.id}>{w.name} (#{w.id})</option>
                              ))}
                          </select>
                          <button onClick={() => confirmAllocate(r.id)} disabled={!allocWorker || busy === `alloc-req-${r.id}`}
                            className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 text-white disabled:opacity-50 hover:bg-emerald-700 transition">
                            OK
                          </button>
                          <button onClick={() => setAllocatingReq(null)}
                            className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 transition">
                            ✕
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
              {requests.length === 0 && !tabErrors.Requests && (
                <p className="text-sm text-gray-400 py-6 text-center">No service requests yet.</p>
              )}
            </Section>
          )}

          {tab === 'AI Assistant' && (
            <Section title="AI assistant" sub="Analytics & upgrades (advisory)" icon={Sparkles}>
              <AIAssistant />
            </Section>
          )}

          {tab === 'Federations' && (
            <Section title="Federation management" sub={`${feds.length} federations`} icon={Building2}>
              <Table head={['ID', 'Name', 'Societies', 'Workers', 'Active', 'Actions']}>
                {feds.map((f) => (
                  <tr key={f.id} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono">#{f.id}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900">{f.name}</td>
                    <td className="py-2.5 px-3 tabular-nums">{f.society_count}</td>
                    <td className="py-2.5 px-3 tabular-nums">{f.worker_count}</td>
                    <td className="py-2.5 px-3">{f.is_active ? badge('active') : badge('expired')}</td>
                    <td className="py-2.5 px-3">
                      <button onClick={() => toggleFed(f)} disabled={busy === `fed-${f.id}`} className={btnGhost}>
                        {f.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </Table>
            </Section>
          )}

          {tab === 'Societies' && (
            <Section title="Society (Co-op) management" sub={`${coops.length} societies`} icon={Users}>
              <Table head={['ID', 'Name', 'Workers', 'Pending', 'Active jobs', 'Needs', 'Active', 'Actions']}>
                {coops.map((c) => (
                  <tr key={c.id} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono">#{c.id}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900">{c.name}</td>
                    <td className="py-2.5 px-3 tabular-nums">{c.worker_count}</td>
                    <td className="py-2.5 px-3 tabular-nums">{c.pending_requests}</td>
                    <td className="py-2.5 px-3 tabular-nums">{c.active_bookings}</td>
                    <td className="py-2.5 px-3 tabular-nums">{c.workforce_requirements}</td>
                    <td className="py-2.5 px-3">{c.is_active ? badge('active') : badge('expired')}</td>
                    <td className="py-2.5 px-3">
                      <button onClick={() => toggleCoop(c)} disabled={busy === `coop-${c.id}`} className={btnGhost}>
                        {c.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </Table>
            </Section>
          )}

          {tab === 'Workers' && (
            <Section title="Worker management" sub={`${shownWorkers.length} shown`} icon={Briefcase} right={
              <select value={workerFilter} onChange={(e) => setWorkerFilter(e.target.value)}
                className="text-xs font-bold border border-slate-200 rounded-xl px-2.5 py-2 bg-white">
                <option value="all">All ({workers.length})</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            }>
              <Table head={['ID', 'Name', 'Phone', 'Rating', 'Status', 'Actions']}>
                {shownWorkers.slice(0, 100).map((w) => (
                  <tr key={w.id} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono">#{w.id}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900">{w.name}</td>
                    <td className="py-2.5 px-3">{w.phone}</td>
                    <td className="py-2.5 px-3 tabular-nums">{Number(w.average_rating || 0).toFixed(1)} ({w.total_completed_services || 0})</td>
                    <td className="py-2.5 px-3">{badge(w.verification_status)}</td>
                    <td className="py-2.5 px-3">
                      <span className="flex flex-wrap gap-1">
                        <button onClick={() => verifyWorker(w.id, 'verify')} disabled={busy === `w-${w.id}`}
                          className="px-2 py-1 text-[11px] font-bold rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50 transition">Verify</button>
                        <button onClick={() => verifyWorker(w.id, 'suspend')} disabled={busy === `w-${w.id}`}
                          className="px-2 py-1 text-[11px] font-bold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 transition">Suspend</button>
                        <button onClick={() => verifyWorker(w.id, 'review')} disabled={busy === `w-${w.id}`}
                          className="px-2 py-1 text-[11px] font-bold rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50 transition">Review</button>
                      </span>
                    </td>
                  </tr>
                ))}
              </Table>
              {shownWorkers.length > 100 && <p className="text-xs text-gray-400 mt-2">Showing first 100 of {shownWorkers.length}.</p>}
            </Section>
          )}

          {tab === 'Workforce' && (
            <Section title="Society workforce requirements" icon={Users}>
              <Table head={['ID', 'Title', 'Society', 'Workers', 'Accepted', 'Remaining', 'Status', 'Open']}>
                {workforce.map((r) => (
                  <tr key={r.id} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono">#{r.id}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900">{r.title}</td>
                    <td className="py-2.5 px-3">{r.cooperative_name}</td>
                    <td className="py-2.5 px-3 tabular-nums">{r.total_workers_required}</td>
                    <td className="py-2.5 px-3 tabular-nums">{r.workers_accepted}</td>
                    <td className="py-2.5 px-3 font-bold tabular-nums">{r.workers_remaining}</td>
                    <td className="py-2.5 px-3">{badge(r.status)}</td>
                    <td className="py-2.5 px-3"><Link to={`/workforce/${r.id}`} className="text-indigo-600 font-bold hover:underline">Open</Link></td>
                  </tr>
                ))}
              </Table>
            </Section>
          )}

          {tab === 'Matching' && (
            <Section title="Matching & allocation monitor" icon={GitBranch}>
              <Table head={['ID', 'Request', 'Worker', 'Society', 'Score', 'Status']}>
                {allocations.slice(0, 100).map((a) => (
                  <tr key={a.id} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono">#{a.id}</td>
                    <td className="py-2.5 px-3 font-mono">#{a.request_id}</td>
                    <td className="py-2.5 px-3">{a.worker_name || `#${a.worker_id}`}</td>
                    <td className="py-2.5 px-3">{a.cooperative_name}</td>
                    <td className="py-2.5 px-3 tabular-nums font-bold text-indigo-600">{a.recommendation_score != null ? `${Number(a.recommendation_score).toFixed(1)}%` : '—'}</td>
                    <td className="py-2.5 px-3">{badge(a.status)}</td>
                  </tr>
                ))}
              </Table>
            </Section>
          )}

          {tab === 'Payments' && payments && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card label="Revenue" icon={Wallet} tone="bg-indigo-50 text-indigo-600" value={<CountNum value={payments.totals.revenue} money />} />
                <Card label="Commission" icon={Wallet} tone="bg-violet-50 text-violet-600" value={<CountNum value={payments.totals.commission} money />} />
                <Card label="Welfare" icon={HeartHandshake} tone="bg-rose-50 text-rose-600" value={<CountNum value={payments.totals.welfare} money />} />
                <Card label="Payouts" icon={Wallet} tone="bg-teal-50 text-teal-600" value={<CountNum value={payments.totals.payouts} money />} />
              </div>
              <Section title="Transactions" icon={Wallet}>
                <Table head={['ID', 'Booking', 'Customer', 'Service', 'Amount', 'Status']}>
                  {payments.payments.slice(0, 100).map((p) => (
                    <tr key={p.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono">#{p.id}</td>
                      <td className="py-2.5 px-3 font-mono">#{p.booking_id}</td>
                      <td className="py-2.5 px-3">{p.customer_name}</td>
                      <td className="py-2.5 px-3">{p.service_name}</td>
                      <td className="py-2.5 px-3 font-bold tabular-nums">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3">{badge(p.status)}</td>
                    </tr>
                  ))}
                </Table>
              </Section>
            </div>
          )}

          {tab === 'Welfare' && welfare && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Card label="Welfare fund (2% of services)" icon={HeartHandshake} tone="bg-rose-50 text-rose-600" value={`₹${Number(welfare.fund_total).toLocaleString('en-IN')}`} />
                <Card label="Enrollments" icon={Users} tone="bg-indigo-50 text-indigo-600" value={welfare.enrollments.length} />
              </div>
              <Section title="Worker support enrollments" icon={HeartHandshake}>
                <Table head={['ID', 'Worker', 'Scheme', 'Status']}>
                  {welfare.enrollments.slice(0, 100).map((e) => (
                    <tr key={e.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="py-2 px-3 font-mono">#{e.id}</td>
                      <td className="py-2 px-3">#{e.worker_id}</td>
                      <td className="py-2 px-3">{e.scheme_name}</td>
                      <td className="py-2 px-3">{badge(e.enrollment_status)}</td>
                    </tr>
                  ))}
                </Table>
              </Section>
            </div>
          )}

          {tab === 'Disputes' && (
            <Section title="Disputes — review & resolve" sub={openDisputes > 0 ? `${openDisputes} open` : 'All clear'} icon={AlertTriangle}>
              <Table head={['ID', 'Booking', 'Category', 'Status', 'Actions']}>
                {disputes.map((d) => (
                  <tr key={d.id} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono">#{d.id}</td>
                    <td className="py-2.5 px-3 font-mono">{d.booking_id ? `#${d.booking_id}` : '—'}</td>
                    <td className="py-2.5 px-3">{d.category}</td>
                    <td className="py-2.5 px-3">{badge(d.status)}</td>
                    <td className="py-2.5 px-3">
                      {['open', 'under_review', 'awaiting_response'].includes(d.status) ? (
                        <span className="flex gap-1">
                          <button onClick={() => resolveDispute(d.id, 'resolved')} disabled={busy === `d-${d.id}`}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50 transition">Resolve</button>
                          <button onClick={() => resolveDispute(d.id, 'rejected')} disabled={busy === `d-${d.id}`}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 transition">Reject</button>
                        </span>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </Table>
              {disputes.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">No disputes.</p>}
            </Section>
          )}

          {tab === 'Services' && (
            <div className="space-y-4">
              <Section title="Add category" icon={Wrench}>
                <div className="grid sm:grid-cols-4 gap-2">
                  <input value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                    placeholder="Name" className={inputCls} />
                  <input value={newCat.slug} onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })}
                    placeholder="slug" className={inputCls} />
                  <input value={newCat.description} onChange={(e) => setNewCat({ ...newCat, description: e.target.value })}
                    placeholder="Description" className={inputCls} />
                  <button onClick={createCategory} disabled={busy === 'newcat'} className={btnPrimary}>Add</button>
                </div>
              </Section>
              <Section title="Add service" icon={Wrench}>
                <div className="grid sm:grid-cols-5 gap-2">
                  <input value={newSvc.name} onChange={(e) => setNewSvc({ ...newSvc, name: e.target.value })}
                    placeholder="Name" className={inputCls} />
                  <input value={newSvc.slug} onChange={(e) => setNewSvc({ ...newSvc, slug: e.target.value })}
                    placeholder="slug" className={inputCls} />
                  <select value={newSvc.category_id} onChange={(e) => setNewSvc({ ...newSvc, category_id: e.target.value })}
                    className={`${inputCls} bg-white`}>
                    <option value="">Category</option>
                    {services.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input type="number" value={newSvc.base_price} onChange={(e) => setNewSvc({ ...newSvc, base_price: e.target.value })}
                    placeholder="Price" className={inputCls} />
                  <button onClick={createService} disabled={busy === 'newsvc'} className={btnPrimary}>Add</button>
                </div>
              </Section>
              {services.map((c) => (
                <Section key={c.id} title={`${c.name} (${(c.services || []).length})`} icon={Wrench}>
                  <Table head={['Service', 'Price', 'Active', 'Action']}>
                    {(c.services || []).map((s) => (
                      <tr key={s.id} className="hover:bg-indigo-50/40 transition-colors">
                        <td className="py-2 px-3 font-semibold text-gray-900">{s.name}</td>
                        <td className="py-2 px-3 tabular-nums">₹{Number(s.base_price || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3">{s.is_active ? badge('active') : badge('expired')}</td>
                        <td className="py-2 px-3">
                          <button onClick={() => toggleService(s)} disabled={busy === `svc-${s.id}`} className={btnGhost}>
                            {s.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </Table>
                </Section>
              ))}
            </div>
          )}

          {tab === 'Analytics' && (
            <Section title="Demand hotspots" icon={BarChart3}>
              <Table head={['Area', 'Demand', 'Bookings', 'Workers']}>
                {heatmap.slice(0, 20).map((h, i) => (
                  <tr key={i} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="py-2.5 px-3 font-semibold">{h.area || h.label || `#${i + 1}`}</td>
                    <td className="py-2.5 px-3 font-bold text-indigo-600 tabular-nums">{h.demand ?? h.count ?? '—'}</td>
                    <td className="py-2.5 px-3 tabular-nums">{h.bookings ?? '—'}</td>
                    <td className="py-2.5 px-3 tabular-nums">{h.workers ?? h.available_workers ?? '—'}</td>
                  </tr>
                ))}
              </Table>
              {heatmap.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">No analytics data yet.</p>}
            </Section>
          )}

          {tab === 'Notifications' && (
            <div className="space-y-4">
              <Section title="Broadcast to users" icon={Bell}>
                <div className="grid sm:grid-cols-4 gap-2">
                  <input value={broadcast.title} onChange={(e) => setBroadcast({ ...broadcast, title: e.target.value })}
                    placeholder="Title" className={inputCls} />
                  <input value={broadcast.message} onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })}
                    placeholder="Message" className={inputCls} />
                  <select value={broadcast.role} onChange={(e) => setBroadcast({ ...broadcast, role: e.target.value })}
                    className={`${inputCls} bg-white`}>
                    <option value="">All roles</option>
                    <option value="customer">Customers</option>
                    <option value="worker">Workers</option>
                    <option value="cooperative_admin">Societies</option>
                    <option value="federation_admin">Federations</option>
                  </select>
                  <button onClick={sendBroadcast} disabled={busy === 'broadcast'} className={btnPrimary}>Send</button>
                </div>
              </Section>
              <Section title="My recent notifications" icon={Bell}>
                <Table head={['ID', 'Title', 'Message', 'Read']}>
                  {(Array.isArray(notifs) ? notifs : notifs?.notifications || []).slice(0, 30).map((n) => (
                    <tr key={n.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="py-2 px-3 font-mono">#{n.id}</td>
                      <td className="py-2 px-3 font-semibold text-gray-900">{n.title}</td>
                      <td className="py-2 px-3 max-w-xs truncate">{n.message}</td>
                      <td className="py-2 px-3">{n.is_read ? badge('active') : badge('pending')}</td>
                    </tr>
                  ))}
                </Table>
              </Section>
            </div>
          )}

          {tab === 'Audit' && (
            <Section title="Audit trail" sub="Who did what, when, on which record" icon={ScrollText}>
              <Table head={['ID', 'Actor', 'Role', 'Action', 'Entity', 'Details', 'When']}>
                {audit.map((a) => (
                  <tr key={a.id} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="py-2 px-3 font-mono">#{a.id}</td>
                    <td className="py-2 px-3 font-semibold">{a.actor_name || `#${a.actor_id}`}</td>
                    <td className="py-2 px-3">{badge(a.actor_role)}</td>
                    <td className="py-2 px-3 font-mono text-[11px]">{a.action}</td>
                    <td className="py-2 px-3 font-mono text-[11px]">{a.entity_type}:{a.entity_id}</td>
                    <td className="py-2 px-3 max-w-xs truncate">{a.details}</td>
                    <td className="py-2 px-3 text-gray-500 whitespace-nowrap">{a.created_at ? new Date(a.created_at).toLocaleString() : ''}</td>
                  </tr>
                ))}
              </Table>
              {audit.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">No audited actions yet — they appear as admins work.</p>}
            </Section>
          )}
        </motion.div>
      </AnimatePresence>

      <QRScannerModal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} />
    </div>
  );
}
