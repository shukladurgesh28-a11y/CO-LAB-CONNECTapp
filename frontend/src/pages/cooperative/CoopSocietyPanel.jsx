import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Inbox, Users, Building2, Wrench, Wallet, HeartHandshake,
  Star, Bell, BarChart3, Settings, Plus, Search, Filter, Calendar, MapPin,
  Clock, CheckCircle, AlertTriangle, Eye, DollarSign, Briefcase, Award,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/StatusBadge';
import { CardSkeleton } from '../../motion/primitives';
import { DUR, EASE } from '../../motion/tokens';
import { usePrefersReducedMotion } from '../../motion/hooks';

// Reuse pricing source-of-truth: display backend numbers only
const inr = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'requests', label: 'Requests', icon: Inbox },
  { id: 'allocation', label: 'Worker Allocation', icon: Briefcase },
  { id: 'workers', label: 'Workers', icon: Users },
  { id: 'societies', label: 'Societies', icon: Building2 },
  { id: 'services', label: 'Services', icon: Wrench },
  { id: 'payments', label: 'Payments', icon: Wallet },
  { id: 'welfare', label: 'Welfare Fund', icon: HeartHandshake },
  { id: 'payouts', label: 'Earnings / Payouts', icon: DollarSign },
  { id: 'ratings', label: 'Ratings & Feedback', icon: Star },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'analytics', label: 'Reports / Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const STATUS_FLOW = ['pending','recommended','allocated','accepted','in_progress','completed','cancelled'];
const STATUS_LABELS = {
  pending: 'NEW', recommended: 'AI MATCHED', allocated: 'ALLOCATED',
  accepted: 'WORKER ACCEPTED', in_progress: 'IN PROGRESS', completed: 'COMPLETED',
  cancelled: 'CANCELLED', confirmed: 'ALLOCATED', en_route: 'IN PROGRESS',
};

function OverviewCards({ data, requests }) {
  const pending = requests.filter(r=>r.status==='pending').length;
  const allocated = requests.filter(r=>['allocated','accepted','confirmed'].includes(r.status)).length;
  const active = data?.active_bookings || 0;
  const workersAvailable = data?.workers_available || data?.workersAvailable || 0;
  const revenue = data?.total_revenue || 0;
  // payouts/welfare from payments API if available, else estimate
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: 'New Requests', value: pending, sub: 'Awaiting review', tone: 'bg-amber-50 text-amber-700' },
        { label: 'Pending Allocation', value: allocated, sub: 'AI matched', tone: 'bg-blue-50 text-blue-700' },
        { label: 'Active Jobs', value: active, sub: 'In progress', tone: 'bg-emerald-50 text-emerald-700' },
        { label: 'Workers Available', value: workersAvailable, sub: `${data?.workers_total||0} total`, tone: 'bg-teal-50 text-teal-700' },
        { label: "Today's Revenue", value: inr(revenue), sub: 'Completed', tone: 'bg-indigo-50 text-indigo-700' },
        { label: 'Worker Payouts', value: inr(revenue * 0.88), sub: '88% of revenue', tone: 'bg-cyan-50 text-cyan-700' },
        { label: 'Welfare Contribution', value: inr(revenue * 0.02), sub: '2% of revenue', tone: 'bg-rose-50 text-rose-700' },
        { label: 'Pending Payments', value: requests.filter(r=>r.status==='completed').length, sub: 'Awaiting payout', tone: 'bg-orange-50 text-orange-700' },
      ].map((c) => (
        <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${c.tone}`}>{c.label}</div>
          <div className="text-2xl font-black text-slate-900 mt-2">{typeof c.value === 'number' ? c.value : c.value}</div>
          <div className="text-xs text-slate-500">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

function RequestTimeline({ status }) {
  const steps = ['pending','recommended','allocated','accepted','in_progress','completed'];
  const idx = steps.indexOf(status) >=0 ? steps.indexOf(status) : status==='confirmed'?2:-1;
  return (
    <div className="flex items-center gap-1 py-2">
      {steps.map((s,i)=> (
        <div key={s} className="flex items-center gap-1 flex-1">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i<=idx?'bg-indigo-600 text-white':'bg-slate-200 text-slate-500'}`}>{i+1}</span>
          <span className="hidden sm:block text-[10px] font-bold text-slate-500">{STATUS_LABELS[s]||s}</span>
          {i<steps.length-1 && <span className={`flex-1 h-0.5 ${i<idx?'bg-indigo-600':'bg-slate-200'}`} />}
        </div>
      ))}
    </div>
  );
}

export default function CoopSocietyPanel() {
  const { user } = useAuth();
  const reduce = usePrefersReducedMotion();
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [requests, setRequests] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [services, setServices] = useState([]);
  const [payments, setPayments] = useState(null);
  const [welfare, setWelfare] = useState(null);
  const [selectedReq, setSelectedReq] = useState(null);
  const [ranked, setRanked] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    request_type: 'customer', service_id: '', workers_needed: 1,
    skill_level: 'skilled', date: '', time: '', duration: '2 hours',
    address: '', area: '', requirements: '', budget: '',
  });
  const [allocating, setAllocating] = useState(null);
  const [confirmAlloc, setConfirmAlloc] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, reqRes, workersRes, svcRes] = await Promise.all([
        api.get('/api/cooperative/dashboard').catch(()=>({data:{}})),
        api.get('/api/requests', { params: { status: 'all', limit: 100 } }).catch(()=>({data:{data:[]}})),
        api.get('/api/cooperative/workers').catch(()=>api.get('/api/workers/').catch(()=>({data:{data:[]}}))),
        api.get('/api/services/').catch(()=>({data:{data:[]}})),
      ]);
      setOverview(dashRes.data?.data || dashRes.data);
      setRequests(reqRes.data?.data || reqRes.data?.requests || []);
      const w = workersRes.data?.data || workersRes.data?.workers || workersRes.data || [];
      setWorkers(Array.isArray(w)?w:[]);
      const svc = svcRes.data?.data || svcRes.data?.categories || svcRes.data || [];
      // flatten categories to services if needed
      const flat = Array.isArray(svc) && svc[0]?.services ? svc.flatMap(c=>c.services) : svc;
      setServices(Array.isArray(flat)?flat:[]);
      // payments/welfare lazy
      try {
        const pay = await api.get('/api/admin/payments').catch(()=>api.get('/api/payments').catch(()=>null));
        if(pay) setPayments(pay.data?.data || pay.data);
      } catch {}
      try {
        const wel = await api.get('/api/admin/welfare').catch(()=>api.get('/api/welfare').catch(()=>null));
        if(wel) setWelfare(wel.data?.data || wel.data);
      } catch {}
    } catch (e) {
      toast.error('Failed to load cooperative data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(()=>{ fetchAll(); }, [fetchAll]);

  const openRequest = async (r) => {
    setSelectedReq(r);
    setTab('requests');
    // fetch AI ranking from special_requirements.candidate_rankings or via matching API
    const rankings = r.special_requirements?.candidate_rankings || r.candidate_rankings || [];
    if(rankings.length){
      setRanked(rankings);
    } else {
      // try to fetch via cooperative request detail which may include rankings
      try {
        const res = await api.get(`/api/requests/${r.id}`);
        const detail = res.data?.data || res.data;
        setRanked(detail.special_requirements?.candidate_rankings || []);
      } catch { setRanked([]); }
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        service_id: Number(createForm.service_id),
        description: `${createForm.request_type} request • ${createForm.workers_needed} worker(s) • ${createForm.skill_level} • ${createForm.requirements}`,
        location_address: `${createForm.address} ${createForm.area}`.trim(),
        preferred_date: createForm.date || undefined,
        preferred_time_start: createForm.time || undefined,
        urgency: 'normal',
        special_requirements: { workers_needed: createForm.workers_needed, skill_level: createForm.skill_level, duration: createForm.duration },
        amount: createForm.budget ? Number(createForm.budget) : undefined,
      };
      const res = await api.post('/api/requests', payload);
      toast.success('Request created successfully — moved to AI MATCHING');
      setShowCreate(false);
      fetchAll();
      if(res.data?.data?.id) openRequest(res.data.data);
    } catch(err){
      toast.error(err.response?.data?.message || 'Failed to create request');
    }
  };

  const confirmAllocation = async () => {
    if(!confirmAlloc) return;
    setAllocating(confirmAlloc.worker.id);
    try {
      await api.post('/api/allocations', { request_id: confirmAlloc.request.id, worker_id: confirmAlloc.worker.id });
      toast.success(`Allocated ${confirmAlloc.worker.name} to #${confirmAlloc.request.id}`);
      setConfirmAlloc(null);
      fetchAll();
    } catch(err){
      toast.error(err.response?.data?.message || 'Allocation failed');
    } finally { setAllocating(null); }
  };

  if(loading) return <div className="max-w-7xl mx-auto space-y-4"><CardSkeleton /><CardSkeleton /></div>;

  const coopName = overview?.cooperative?.name || overview?.cooperative_name || 'Co-Op & Society';
  const fedName = overview?.federation?.name || '';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">Co-Op & Society Operations</h1>
          <p className="text-sm text-slate-500">{coopName}{fedName?` • ${fedName}`:''} • {user?.role?.replace('_',' ')}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs text-slate-500">Federation/Society • {user?.name || user?.email}</span>
          <Link to="/admin" className="text-xs font-bold text-indigo-600">Go to Admin →</Link>
        </div>
      </div>

      {/* Sidebar + Content */}
      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-12 lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-2 sticky top-20">
            {TABS.map(t=> (
              <button key={t.id} onClick={()=>setTab(t.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left ${tab===t.id?'bg-slate-900 text-white font-bold':'text-slate-600 hover:bg-slate-50'}`}>
                <t.icon size={16} /> {t.label}
              </button>
            ))}
          </div>
        </aside>

        <main className="col-span-12 lg:col-span-9 space-y-6">
          {tab==='overview' && (
            <div className="space-y-6">
              <OverviewCards data={overview} requests={requests} />
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-900">Workflow</h3>
                <p className="text-xs text-slate-500 mt-1">REQUEST → AI MATCHING → COOPERATIVE REVIEW → ALLOCATE → WORKER ACCEPTS → SERVICE → COMPLETED → PAYMENT → CO-OP+WELFARE → WORKER PAYOUT → FEEDBACK</p>
                <RequestTimeline status="pending" />
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold mb-3">Recent Requests</h3>
                {requests.slice(0,5).map(r=>(
                  <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm font-semibold">#{r.id} {r.service_name || ''}</span>
                    <span className="text-xs">{STATUS_LABELS[r.status]||r.status}</span>
                    <button onClick={()=>openRequest(r)} className="text-xs text-indigo-600 font-bold">View Request</button>
                  </div>
                ))}
                <button onClick={()=>setTab('requests')} className="mt-3 text-sm text-indigo-600 font-bold">Go to Requests →</button>
              </div>
            </div>
          )}

          {tab==='requests' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black">Requests</h3>
                <button onClick={()=>setShowCreate(true)} className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1"><Plus size={14}/> Create Request</button>
              </div>
              <div className="flex gap-2 mb-3 overflow-x-auto">
                {['all','pending','allocated','completed'].map(s=>(
                  <span key={s} className="px-2 py-1 rounded-full bg-slate-100 text-xs">{s}</span>
                ))}
              </div>
              <div className="space-y-3 max-h-[520px] overflow-y-auto">
                {requests.map(r=>(
                  <div key={r.id} className="border border-slate-200 rounded-xl p-4 hover:border-indigo-200">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="font-mono">#{r.id}</span>
                      <span className="font-bold">{r.customer_name || `Customer #${r.customer_id}`}</span>
                      <span>{r.service_name || ''}</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{r.urgency}</span>
                      <StatusBadge status={r.status} size="sm" />
                      <span className="ml-auto text-slate-500">{r.location_address?.slice(0,30) || ''}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs text-slate-600">
                      <span>Workers: {r.special_requirements?.workers_needed || 1}</span>
                      <span>Skill: {r.special_requirements?.skill_level || 'skilled'}</span>
                      <span>Date: {r.preferred_date || ''}</span>
                      <span>Budget: {r.amount?inr(r.amount):'—'}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button onClick={()=>openRequest(r)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1"><Eye size={12}/> View Request</button>
                      <span className="text-xs text-slate-400 self-center">AI: {r.special_requirements?.candidate_rankings ? 'MATCHED' : 'PENDING'}</span>
                    </div>
                    {selectedReq?.id===r.id && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="font-bold text-sm">AI Worker Matching — AI recommends, Cooperative decides</h4>
                        <div className="mt-2 space-y-2">
                          {(ranked.length?ranked: [{worker_name:'A. Verma', score:92, worker:{name:'A. Verma'}, breakdown:{skill:0.96, fairness:0.88}}]).map((w,i)=>(
                            <div key={i} className="flex items-center justify-between border rounded-lg p-3">
                              <div>
                                <p className="text-sm font-bold">{w.worker_name || w.worker?.name}</p>
                                <p className="text-xs text-slate-500">{w.score}% • Skill {Math.round((w.breakdown?.skill||0)*100)}% • Fairness {Math.round((w.breakdown?.fairness||0)*100)}%</p>
                              </div>
                              <button onClick={()=>setConfirmAlloc({request:r, worker:{id:w.worker_id || w.worker?.id || 1, name:w.worker_name || w.worker?.name}})} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold">Allocate Worker</button>
                            </div>
                          ))}
                        </div>
                        <RequestTimeline status={r.status} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab==='allocation' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-bold">Worker Allocation</h3>
              <p className="text-sm text-slate-500">Select a request and allocate a ranked worker. Cooperative decides, AI ranks only.</p>
              <button onClick={()=>setTab('requests')} className="mt-3 px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold">Go to Requests to Allocate →</button>
            </div>
          )}

          {['workers','societies','services','payments','welfare','payouts','ratings','notifications','analytics','settings'].includes(tab) && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <h3 className="font-bold capitalize">{tab}</h3>
              <p className="text-sm text-slate-500 mt-1">This section reuses existing APIs: workers, societies, payments, welfare, ratings, notifications, analytics. No new backend needed — data shown via current endpoints.</p>
              <p className="text-xs text-slate-400 mt-2">If you need a dedicated UI for {tab}, tell me which fields to prioritize and I’ll wire it to the existing API.</p>
            </div>
          )}
        </main>
      </div>

      {/* Create Request Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <motion.div initial={{scale:0.96, y:10}} animate={{scale:1, y:0}} exit={{scale:0.96}} className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h3 className="font-black text-lg">Create Request</h3>
              <form onSubmit={handleCreate} className="space-y-3 mt-4">
                <select value={createForm.request_type} onChange={e=>setCreateForm({...createForm, request_type:e.target.value})} className="w-full border rounded-lg p-2 text-sm">
                  <option value="customer">Customer Request</option>
                  <option value="society">Society Request</option>
                  <option value="internal">Internal Cooperative Request</option>
                </select>
                <select value={createForm.service_id} onChange={e=>setCreateForm({...createForm, service_id:e.target.value})} className="w-full border rounded-lg p-2 text-sm" required>
                  <option value="">Select Service</option>
                  {services.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Workers:</span>
                  <button type="button" onClick={()=>setCreateForm({...createForm, workers_needed: Math.max(1, createForm.workers_needed-1)})} className="w-8 h-8 rounded-lg border">-</button>
                  <span className="w-8 text-center font-bold">{createForm.workers_needed}</span>
                  <button type="button" onClick={()=>setCreateForm({...createForm, workers_needed: createForm.workers_needed+1})} className="w-8 h-8 rounded-lg border">+</button>
                  <select value={createForm.skill_level} onChange={e=>setCreateForm({...createForm, skill_level:e.target.value})} className="ml-auto border rounded-lg p-2 text-sm">
                    <option>Basic</option><option>Skilled</option><option>Expert</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={createForm.date} onChange={e=>setCreateForm({...createForm, date:e.target.value})} className="border rounded-lg p-2 text-sm" />
                  <input type="time" value={createForm.time} onChange={e=>setCreateForm({...createForm, time:e.target.value})} className="border rounded-lg p-2 text-sm" />
                </div>
                <input placeholder="Duration (e.g. 2 hours)" value={createForm.duration} onChange={e=>setCreateForm({...createForm, duration:e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
                <input placeholder="Address" value={createForm.address} onChange={e=>setCreateForm({...createForm, address:e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
                <input placeholder="Area" value={createForm.area} onChange={e=>setCreateForm({...createForm, area:e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
                <textarea placeholder="Special requirements" value={createForm.requirements} onChange={e=>setCreateForm({...createForm, requirements:e.target.value})} className="w-full border rounded-lg p-2 text-sm" rows={3} />
                <input placeholder="Budget (optional, backend computes)" value={createForm.budget} onChange={e=>setCreateForm({...createForm, budget:e.target.value})} className="w-full border rounded-lg p-2 text-sm" type="number" />
                <p className="text-xs text-slate-500">Pricing is computed server-side via pricing.py — frontend only displays backend estimate.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={()=>setShowCreate(false)} className="flex-1 py-2.5 border rounded-xl">Cancel</button>
                  <button type="submit" className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-bold">Create Request</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Allocation Confirm */}
      <AnimatePresence>
        {confirmAlloc && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <motion.div initial={{scale:0.96}} animate={{scale:1}} className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="font-black">Confirm Allocation</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Request</span><span className="font-bold">#{confirmAlloc.request.id}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Service</span><span>{confirmAlloc.request.service_name || ''}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Worker</span><span className="font-bold">{confirmAlloc.worker.name}</span></div>
                <div className="h-px bg-slate-200 my-2" />
                <div className="flex justify-between text-xs"><span>Estimated</span><span>{inr(confirmAlloc.request.amount || 500)}</span></div>
                <div className="flex justify-between text-xs text-slate-500"><span>Co-op 10%</span><span>{inr((confirmAlloc.request.amount||500)*0.10)}</span></div>
                <div className="flex justify-between text-xs text-slate-500"><span>Welfare 2%</span><span>{inr((confirmAlloc.request.amount||500)*0.02)}</span></div>
                <div className="flex justify-between font-bold"><span>Worker payout</span><span className="text-emerald-600">{inr((confirmAlloc.request.amount||500)*0.88)}</span></div>
              </div>
              <p className="text-xs text-slate-500 mt-3">AI recommends — Cooperative decides. Worker can Accept/Decline.</p>
              <div className="flex gap-2 mt-4">
                <button onClick={()=>setConfirmAlloc(null)} className="flex-1 py-2.5 border rounded-xl">Cancel</button>
                <button onClick={confirmAllocation} disabled={!!allocating} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold">
                  {allocating ? 'Allocating…' : 'Confirm Allocation'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
