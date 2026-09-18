import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Loader2, Scan } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import QRScannerModal from '../../components/QRScannerModal';

const TABS = [
  'Overview', 'Federations', 'Societies', 'Workers', 'Workforce', 'Matching',
  'Payments', 'Welfare', 'Disputes', 'Services', 'Analytics', 'Notifications', 'Audit',
];

const badge = (s) => (
  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600">
    {String(s ?? '').replaceAll('_', ' ') || '—'}
  </span>
);

const Card = ({ label, value, sub }) => (
  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</div>
    <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
    {sub && <div className="text-[11px] text-gray-500 mt-1">{sub}</div>}
  </div>
);

const Section = ({ title, right, children }) => (
  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-bold text-gray-900">{title}</h3>
      {right}
    </div>
    {children}
  </div>
);

const Table = ({ head, children }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left text-xs text-gray-600">
      <thead className="bg-gray-50 uppercase text-[10px] text-gray-500">
        <tr>{head.map((h) => <th key={h} className="py-2 px-3">{h}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-gray-100">{children}</tbody>
    </table>
  </div>
);

export default function AdminPanel() {
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
  const [loaded, setLoaded] = useState({});
  const [scannerOpen, setScannerOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const [broadcast, setBroadcast] = useState({ title: '', message: '', role: '' });
  const [newCat, setNewCat] = useState({ name: '', slug: '', description: '' });
  const [newSvc, setNewSvc] = useState({ name: '', slug: '', category_id: '', base_price: '500' });

  const get = useCallback(async (url, params) => {
    const res = await api.get(url, { params });
    return res.data?.data ?? res.data;
  }, []);

  const loadTab = useCallback(async (name) => {
    if (loaded[name]) return;
    try {
      if (name === 'Overview') setOverview(await get('/api/admin/overview'));
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
      setLoaded((p) => ({ ...p, [name]: true }));
    } catch (err) {
      toast.error(err.userMessage || `Failed to load ${name}`);
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

  const mutate = async (key, fn, okMsg) => {
    setBusy(key);
    try {
      await fn();
      toast.success(okMsg);
      setLoaded((p) => ({ ...p, [tab]: false }));
      await loadTab(tab);
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

  if (loading) return <Loader2 className="mx-auto mt-20 animate-spin text-indigo-600" />;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-purple-200">
              <ShieldCheck className="w-3.5 h-3.5" /> Platform Administration — central management
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-2">Admin Panel</h1>
            <p className="text-purple-200 text-sm mt-1">Federations, societies, workers, money, disputes — one place.</p>
          </div>
          <button onClick={() => setScannerOpen(true)}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl">
            Audit QR Scanner
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap ${tab === t ? 'bg-purple-700 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && overview && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card label="Federations" value={overview.federations_total} sub={`${overview.federations_active} active`} />
          <Card label="Societies" value={overview.societies_total} sub={`${overview.societies_active} active`} />
          <Card label="Workers" value={overview.workers_total} sub={`${overview.workers_verified} verified`} />
          <Card label="Customers" value={overview.customers_total} sub={`${overview.users_total} users`} />
          <Card label="Active jobs" value={overview.active_jobs} />
          <Card label="Workforce needs" value={overview.workforce_requirements} />
          <Card label="Completed" value={overview.completed_jobs} />
          <Card label="Revenue" value={`₹${Number(overview.revenue_total).toLocaleString('en-IN')}`} sub={`Commission ₹${Number(overview.commission_total).toLocaleString('en-IN')}`} />
          <Card label="Payouts" value={`₹${Number(overview.payouts_total).toLocaleString('en-IN')}`} />
          <Card label="Welfare fund" value={`₹${Number(overview.welfare_fund).toLocaleString('en-IN')}`} sub={`${overview.open_disputes} open disputes`} />
        </div>
      )}

      {tab === 'Federations' && (
        <Section title="Federation management">
          <Table head={['ID', 'Name', 'Societies', 'Workers', 'Active', 'Actions']}>
            {feds.map((f) => (
              <tr key={f.id}>
                <td className="py-2.5 px-3 font-mono">#{f.id}</td>
                <td className="py-2.5 px-3 font-semibold text-gray-900">{f.name}</td>
                <td className="py-2.5 px-3">{f.society_count}</td>
                <td className="py-2.5 px-3">{f.worker_count}</td>
                <td className="py-2.5 px-3">{f.is_active ? 'Yes' : 'No'}</td>
                <td className="py-2.5 px-3">
                  <button onClick={() => toggleFed(f)} disabled={busy === `fed-${f.id}`}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50">
                    {f.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        </Section>
      )}

      {tab === 'Societies' && (
        <Section title="Society management">
          <Table head={['ID', 'Name', 'Workers', 'Pending', 'Active jobs', 'Needs', 'Active', 'Actions']}>
            {coops.map((c) => (
              <tr key={c.id}>
                <td className="py-2.5 px-3 font-mono">#{c.id}</td>
                <td className="py-2.5 px-3 font-semibold text-gray-900">{c.name}</td>
                <td className="py-2.5 px-3">{c.worker_count}</td>
                <td className="py-2.5 px-3">{c.pending_requests}</td>
                <td className="py-2.5 px-3">{c.active_bookings}</td>
                <td className="py-2.5 px-3">{c.workforce_requirements}</td>
                <td className="py-2.5 px-3">{c.is_active ? 'Yes' : 'No'}</td>
                <td className="py-2.5 px-3">
                  <button onClick={() => toggleCoop(c)} disabled={busy === `coop-${c.id}`}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50">
                    {c.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        </Section>
      )}

      {tab === 'Workers' && (
        <Section title="Worker management" right={
          <select value={workerFilter} onChange={(e) => setWorkerFilter(e.target.value)}
            className="text-xs border rounded-lg px-2.5 py-1.5">
            <option value="all">All ({workers.length})</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        }>
          <Table head={['ID', 'Name', 'Phone', 'Rating', 'Jobs', 'Status', 'Actions']}>
            {shownWorkers.slice(0, 100).map((w) => (
              <tr key={w.id}>
                <td className="py-2.5 px-3 font-mono">#{w.id}</td>
                <td className="py-2.5 px-3 font-semibold text-gray-900">{w.name}</td>
                <td className="py-2.5 px-3">{w.phone}</td>
                <td className="py-2.5 px-3">{Number(w.average_rating || 0).toFixed(1)} ({w.total_completed_services || 0})</td>
                <td className="py-2.5 px-3">{badge(w.verification_status)}</td>
                <td className="py-2.5 px-3 flex flex-wrap gap-1">
                  <button onClick={() => verifyWorker(w.id, 'verify')} disabled={busy === `w-${w.id}`}
                    className="px-2 py-0.5 text-[11px] font-semibold rounded bg-emerald-100 text-emerald-700 disabled:opacity-50">Verify</button>
                  <button onClick={() => verifyWorker(w.id, 'suspend')} disabled={busy === `w-${w.id}`}
                    className="px-2 py-0.5 text-[11px] font-semibold rounded bg-red-100 text-red-700 disabled:opacity-50">Suspend</button>
                  <button onClick={() => verifyWorker(w.id, 'review')} disabled={busy === `w-${w.id}`}
                    className="px-2 py-0.5 text-[11px] font-semibold rounded bg-amber-100 text-amber-700 disabled:opacity-50">Review</button>
                </td>
              </tr>
            ))}
          </Table>
          {shownWorkers.length > 100 && <p className="text-xs text-gray-400 mt-2">Showing first 100 of {shownWorkers.length}.</p>}
        </Section>
      )}

      {tab === 'Workforce' && (
        <Section title="Society workforce requirements">
          <Table head={['ID', 'Title', 'Society', 'Workers', 'Accepted', 'Remaining', 'Status', 'Open']}>
            {workforce.map((r) => (
              <tr key={r.id}>
                <td className="py-2.5 px-3 font-mono">#{r.id}</td>
                <td className="py-2.5 px-3 font-semibold text-gray-900">{r.title}</td>
                <td className="py-2.5 px-3">{r.cooperative_name}</td>
                <td className="py-2.5 px-3">{r.total_workers_required}</td>
                <td className="py-2.5 px-3">{r.workers_accepted}</td>
                <td className="py-2.5 px-3 font-bold">{r.workers_remaining}</td>
                <td className="py-2.5 px-3">{badge(r.status)}</td>
                <td className="py-2.5 px-3"><Link to={`/workforce/${r.id}`} className="text-purple-700 font-semibold">Open</Link></td>
              </tr>
            ))}
          </Table>
        </Section>
      )}

      {tab === 'Matching' && (
        <Section title="Matching & allocation monitor">
          <Table head={['ID', 'Request', 'Worker', 'Society', 'Score', 'Status']}>
            {allocations.slice(0, 100).map((a) => (
              <tr key={a.id}>
                <td className="py-2.5 px-3 font-mono">#{a.id}</td>
                <td className="py-2.5 px-3 font-mono">#{a.request_id}</td>
                <td className="py-2.5 px-3">{a.worker_name || `#${a.worker_id}`}</td>
                <td className="py-2.5 px-3">{a.cooperative_name}</td>
                <td className="py-2.5 px-3">{a.recommendation_score != null ? `${Number(a.recommendation_score).toFixed(1)}%` : '—'}</td>
                <td className="py-2.5 px-3">{badge(a.status)}</td>
              </tr>
            ))}
          </Table>
        </Section>
      )}

      {tab === 'Payments' && payments && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card label="Revenue" value={`₹${Number(payments.totals.revenue).toLocaleString('en-IN')}`} />
            <Card label="Commission" value={`₹${Number(payments.totals.commission).toLocaleString('en-IN')}`} />
            <Card label="Welfare" value={`₹${Number(payments.totals.welfare).toLocaleString('en-IN')}`} />
            <Card label="Payouts" value={`₹${Number(payments.totals.payouts).toLocaleString('en-IN')}`} />
          </div>
          <Section title="Transactions">
            <Table head={['ID', 'Booking', 'Customer', 'Service', 'Amount', 'Status']}>
              {payments.payments.slice(0, 100).map((p) => (
                <tr key={p.id}>
                  <td className="py-2.5 px-3 font-mono">#{p.id}</td>
                  <td className="py-2.5 px-3 font-mono">#{p.booking_id}</td>
                  <td className="py-2.5 px-3">{p.customer_name}</td>
                  <td className="py-2.5 px-3">{p.service_name}</td>
                  <td className="py-2.5 px-3 font-semibold">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3">{badge(p.status)}</td>
                </tr>
              ))}
            </Table>
          </Section>
        </div>
      )}

      {tab === 'Welfare' && welfare && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card label="Welfare fund (2% of services)" value={`₹${Number(welfare.fund_total).toLocaleString('en-IN')}`} />
            <Card label="Enrollments" value={welfare.enrollments.length} />
          </div>
          <Section title="Worker support enrollments">
            <Table head={['ID', 'Worker', 'Scheme', 'Status']}>
              {welfare.enrollments.slice(0, 100).map((e) => (
                <tr key={e.id}>
                  <td className="py-2.5 px-3 font-mono">#{e.id}</td>
                  <td className="py-2.5 px-3">#{e.worker_id}</td>
                  <td className="py-2.5 px-3">{e.scheme_name}</td>
                  <td className="py-2.5 px-3">{badge(e.enrollment_status)}</td>
                </tr>
              ))}
            </Table>
          </Section>
        </div>
      )}

      {tab === 'Disputes' && (
        <Section title="Disputes — review & resolve">
          <Table head={['ID', 'Booking', 'Category', 'Status', 'Actions']}>
            {disputes.map((d) => (
              <tr key={d.id}>
                <td className="py-2.5 px-3 font-mono">#{d.id}</td>
                <td className="py-2.5 px-3 font-mono">{d.booking_id ? `#${d.booking_id}` : '—'}</td>
                <td className="py-2.5 px-3">{d.category}</td>
                <td className="py-2.5 px-3">{badge(d.status)}</td>
                <td className="py-2.5 px-3 flex gap-1">
                  {['open', 'under_review', 'awaiting_response'].includes(d.status) && (
                    <>
                      <button onClick={() => resolveDispute(d.id, 'resolved')} disabled={busy === `d-${d.id}`}
                        className="px-2 py-0.5 text-[11px] font-semibold rounded bg-emerald-100 text-emerald-700 disabled:opacity-50">Resolve</button>
                      <button onClick={() => resolveDispute(d.id, 'rejected')} disabled={busy === `d-${d.id}`}
                        className="px-2 py-0.5 text-[11px] font-semibold rounded bg-gray-100 text-gray-600 disabled:opacity-50">Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </Table>
          {disputes.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No disputes.</p>}
        </Section>
      )}

      {tab === 'Services' && (
        <div className="space-y-4">
          <Section title="Add category">
            <div className="grid sm:grid-cols-4 gap-2">
              <input value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                placeholder="Name" className="px-3 py-2 border rounded-lg text-sm" />
              <input value={newCat.slug} onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })}
                placeholder="slug" className="px-3 py-2 border rounded-lg text-sm" />
              <input value={newCat.description} onChange={(e) => setNewCat({ ...newCat, description: e.target.value })}
                placeholder="Description" className="px-3 py-2 border rounded-lg text-sm" />
              <button onClick={createCategory} disabled={busy === 'newcat'}
                className="px-3 py-2 bg-purple-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">Add</button>
            </div>
          </Section>
          <Section title="Add service">
            <div className="grid sm:grid-cols-5 gap-2">
              <input value={newSvc.name} onChange={(e) => setNewSvc({ ...newSvc, name: e.target.value })}
                placeholder="Name" className="px-3 py-2 border rounded-lg text-sm" />
              <input value={newSvc.slug} onChange={(e) => setNewSvc({ ...newSvc, slug: e.target.value })}
                placeholder="slug" className="px-3 py-2 border rounded-lg text-sm" />
              <select value={newSvc.category_id} onChange={(e) => setNewSvc({ ...newSvc, category_id: e.target.value })}
                className="px-3 py-2 border rounded-lg text-sm bg-white">
                <option value="">Category</option>
                {services.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="number" value={newSvc.base_price} onChange={(e) => setNewSvc({ ...newSvc, base_price: e.target.value })}
                placeholder="Price" className="px-3 py-2 border rounded-lg text-sm" />
              <button onClick={createService} disabled={busy === 'newsvc'}
                className="px-3 py-2 bg-purple-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">Add</button>
            </div>
          </Section>
          {services.map((c) => (
            <Section key={c.id} title={`${c.name} (${(c.services || []).length})`}>
              <Table head={['Service', 'Price', 'Active', 'Action']}>
                {(c.services || []).map((s) => (
                  <tr key={s.id}>
                    <td className="py-2 px-3 font-medium text-gray-900">{s.name}</td>
                    <td className="py-2 px-3">₹{Number(s.base_price || 0).toLocaleString('en-IN')}</td>
                    <td className="py-2 px-3">{s.is_active ? 'Yes' : 'No'}</td>
                    <td className="py-2 px-3">
                      <button onClick={() => toggleService(s)} disabled={busy === `svc-${s.id}`}
                        className="px-2 py-0.5 text-[11px] font-semibold rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50">
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
        <Section title="Demand hotspots">
          <Table head={['Area', 'Demand', 'Bookings', 'Workers']}>
            {heatmap.slice(0, 20).map((h, i) => (
              <tr key={i}>
                <td className="py-2.5 px-3">{h.area || h.label || `#${i + 1}`}</td>
                <td className="py-2.5 px-3 font-bold">{h.demand ?? h.count ?? '—'}</td>
                <td className="py-2.5 px-3">{h.bookings ?? '—'}</td>
                <td className="py-2.5 px-3">{h.workers ?? h.available_workers ?? '—'}</td>
              </tr>
            ))}
          </Table>
          {heatmap.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No analytics data yet.</p>}
        </Section>
      )}

      {tab === 'Notifications' && (
        <div className="space-y-4">
          <Section title="Broadcast to users">
            <div className="grid sm:grid-cols-4 gap-2">
              <input value={broadcast.title} onChange={(e) => setBroadcast({ ...broadcast, title: e.target.value })}
                placeholder="Title" className="px-3 py-2 border rounded-lg text-sm" />
              <input value={broadcast.message} onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })}
                placeholder="Message" className="px-3 py-2 border rounded-lg text-sm" />
              <select value={broadcast.role} onChange={(e) => setBroadcast({ ...broadcast, role: e.target.value })}
                className="px-3 py-2 border rounded-lg text-sm bg-white">
                <option value="">All roles</option>
                <option value="customer">Customers</option>
                <option value="worker">Workers</option>
                <option value="cooperative_admin">Societies</option>
                <option value="federation_admin">Federations</option>
              </select>
              <button onClick={sendBroadcast} disabled={busy === 'broadcast'}
                className="px-3 py-2 bg-purple-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">Send</button>
            </div>
          </Section>
          <Section title="My recent notifications">
            <Table head={['ID', 'Title', 'Message', 'Read']}>
              {(Array.isArray(notifs) ? notifs : notifs?.notifications || []).slice(0, 30).map((n) => (
                <tr key={n.id}>
                  <td className="py-2 px-3 font-mono">#{n.id}</td>
                  <td className="py-2 px-3 font-medium text-gray-900">{n.title}</td>
                  <td className="py-2 px-3">{n.message}</td>
                  <td className="py-2 px-3">{n.is_read ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </Table>
          </Section>
        </div>
      )}

      {tab === 'Audit' && (
        <Section title="Audit trail — who did what, when, on which record">
          <Table head={['ID', 'Actor', 'Role', 'Action', 'Entity', 'Details', 'When']}>
            {audit.map((a) => (
              <tr key={a.id}>
                <td className="py-2 px-3 font-mono">#{a.id}</td>
                <td className="py-2 px-3">{a.actor_name || `#${a.actor_id}`}</td>
                <td className="py-2 px-3">{a.actor_role}</td>
                <td className="py-2 px-3 font-mono text-[11px]">{a.action}</td>
                <td className="py-2 px-3 font-mono text-[11px]">{a.entity_type}:{a.entity_id}</td>
                <td className="py-2 px-3 max-w-xs truncate">{a.details}</td>
                <td className="py-2 px-3 text-gray-500">{a.created_at ? new Date(a.created_at).toLocaleString() : ''}</td>
              </tr>
            ))}
          </Table>
          {audit.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No audited actions yet — they appear as admins work.</p>}
        </Section>
      )}

      <QRScannerModal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} />
    </div>
  );
}
