import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/StatusBadge';
import { CardSkeleton } from '../../motion/primitives';

const inr = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

function OverviewCards({ data, requests }) {
  const pending = requests.filter(r=>r.status==='pending').length;
  const allocated = requests.filter(r=>['allocated','accepted','confirmed'].includes(r.status)).length;
  const active = data?.active_bookings || 0;
  const workersAvailable = data?.workers_available || data?.workersAvailable || 0;
  const revenue = data?.total_revenue || 0;
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

export default function CoopSocietyPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [requests, setRequests] = useState([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, reqRes] = await Promise.all([
        api.get('/api/cooperative/dashboard').catch(()=>({data:{}})),
        api.get('/api/requests', { params: { status: 'all', limit: 100 } }).catch(()=>({data:{data:[]}})),
      ]);
      setOverview(dashRes.data?.data || dashRes.data);
      setRequests(reqRes.data?.data || reqRes.data?.requests || []);
    } catch (e) {
      toast.error('Failed to load cooperative data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(()=>{ fetchAll(); }, [fetchAll]);

  if(loading) return <div className="max-w-7xl mx-auto space-y-4"><CardSkeleton /><CardSkeleton /></div>;

  const coopName = overview?.cooperative?.name || overview?.cooperative_name || 'Co-Op & Society';
  const fedName = overview?.federation?.name || '';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header — single, not duplicated */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">Co-Op & Society Operations</h1>
          <p className="text-sm text-slate-500">{coopName}{fedName?` • ${fedName}`:''} • {user?.role?.replace('_',' ')}</p>
          <p className="text-xs text-slate-400 mt-1">Operational control center — use the left sidebar to navigate. Customer and Worker panels are separate and not mixed.</p>
        </div>
        <Link to="/admin" className="text-xs font-bold text-indigo-600 hover:underline">Go to Admin →</Link>
      </div>

      <OverviewCards data={overview} requests={requests} />

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-900">Workflow</h3>
        <p className="text-xs text-slate-500 mt-1">REQUEST → AI MATCHING → COOPERATIVE REVIEW → ALLOCATE → WORKER ACCEPTS → SERVICE → COMPLETED → PAYMENT → CO-OP+WELFARE → WORKER PAYOUT → FEEDBACK</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {['REQUEST','AI MATCHING','REVIEW','ALLOCATE','ACCEPT','SERVICE','PAYMENT','PAYOUT','FEEDBACK'].map(s=>(
            <span key={s} className="px-2 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-600">{s}</span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Recent Requests</h3>
          <Link to="/cooperative/requests" className="text-sm font-bold text-indigo-600">View all →</Link>
        </div>
        {requests.length===0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No requests yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-slate-100">
            {requests.slice(0,5).map(r=>(
              <Link key={r.id} to={`/cooperative/requests/${r.id}`} className="flex items-center justify-between py-3 hover:bg-slate-50 px-2 rounded-lg">
                <div>
                  <p className="text-sm font-bold">#{r.id} {r.service_name || ''}</p>
                  <p className="text-xs text-slate-500">{r.customer_name || `Customer #${r.customer_id}`} • {r.location_address?.slice(0,30) || ''}</p>
                </div>
                <StatusBadge status={r.status} size="sm" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/cooperative/workers" className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-200">
          <h4 className="font-bold text-sm">Workers</h4>
          <p className="text-xs text-slate-500 mt-1">{overview?.workers_total || 0} total • {overview?.workers_available || 0} available</p>
          <p className="text-xs font-bold text-indigo-600 mt-2">Manage →</p>
        </Link>
        <Link to="/cooperative/allocations" className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-200">
          <h4 className="font-bold text-sm">Worker Allocation</h4>
          <p className="text-xs text-slate-500 mt-1">AI ranks, cooperative decides</p>
          <p className="text-xs font-bold text-indigo-600 mt-2">Allocate →</p>
        </Link>
        <Link to="/cooperative/workforce" className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-200">
          <h4 className="font-bold text-sm">Societies</h4>
          <p className="text-xs text-slate-500 mt-1">Society = Co-op registry</p>
          <p className="text-xs font-bold text-indigo-600 mt-2">View →</p>
        </Link>
      </div>
    </div>
  );
}
