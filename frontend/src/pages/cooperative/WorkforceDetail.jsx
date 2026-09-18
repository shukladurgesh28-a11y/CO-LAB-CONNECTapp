import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Loader2, Sparkles, CheckCircle, XCircle } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import ServiceMap from '../../components/ServiceMap';

const STATUS_STYLES = {
  DRAFT: 'bg-gray-100 text-gray-600', SUBMITTED: 'bg-yellow-100 text-yellow-700',
  UNDER_REVIEW: 'bg-orange-100 text-orange-700', MATCHING: 'bg-purple-100 text-purple-700',
  PARTIALLY_FULFILLED: 'bg-amber-100 text-amber-800', FULLY_FULFILLED: 'bg-blue-100 text-blue-700',
  WORK_IN_PROGRESS: 'bg-indigo-100 text-indigo-700', COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-400', EXPIRED: 'bg-red-100 text-red-600',
  PENDING: 'bg-gray-100 text-gray-600', offered: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-blue-100 text-blue-700', declined: 'bg-red-100 text-red-600',
  completed: 'bg-green-100 text-green-700', cancelled: 'bg-gray-100 text-gray-400',
};

const badge = (s) => (
  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_STYLES[s] || STATUS_STYLES.DRAFT}`}>
    {String(s || '').replaceAll('_', ' ')}
  </span>
);

export default function WorkforceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [req, setReq] = useState(null);
  const [progress, setProgress] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loading, setLoading] = useState(true);

  const isSociety = user?.role === 'cooperative_admin';
  const isFederation = ['federation_admin', 'platform_admin'].includes(user?.role);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [detail, prog] = await Promise.all([
        api.get(`/api/society/workforce/requirements/${id}`),
        api.get(`/api/society/workforce/requirements/${id}/progress`).catch(() => ({ data: null })),
      ]);
      setReq(detail.data?.data);
      setProgress(prog.data?.data || null);
    } catch (err) {
      toast.error(err.userMessage || 'Failed to load requirement');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const act = async (fn, okMsg) => {
    try { await fn(); toast.success(okMsg); fetchAll(); }
    catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
  };

  const fetchMatches = async () => {
    try {
      setLoadingMatches(true);
      const res = await api.get(`/api/society/workforce/requirements/${id}/matches`);
      setMatches(res.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Matching failed');
    } finally {
      setLoadingMatches(false);
    }
  };

  const allocate = (itemId, workerId) =>
    act(() => api.post(`/api/society/workforce/items/${itemId}/allocate`, { worker_id: workerId }), 'Worker allocated');

  if (loading) return <Loader2 className="mx-auto mt-20 animate-spin text-indigo-600" />;
  if (!req) return <p className="p-8 text-center text-gray-500">Requirement not found.</p>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900">
        <ArrowLeft size={18} /><span className="text-sm font-medium">Back</span>
      </button>

      <div className="bg-white rounded-2xl border p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400">Requirement #{req.id} • {req.cooperative_name}</p>
            <h1 className="text-2xl font-bold text-gray-900">{req.title}</h1>
            <p className="text-sm text-gray-600 mt-1">{req.description}</p>
          </div>
          {badge(req.status)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 text-center">
          {[['Worker types', req.total_worker_types], ['Workers', req.total_workers_required],
            ['Worker-days', req.total_worker_days], ['Accepted', req.workers_accepted]].map(([l, v]) => (
            <div key={l} className="bg-gray-50 rounded-xl py-3">
              <div className="text-xl font-extrabold text-gray-900">{v}</div>
              <div className="text-[11px] text-gray-500">{l}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-5">
          {isSociety && req.status === 'DRAFT' && (
            <button onClick={() => act(() => api.post(`/api/society/workforce/requirements/${id}/submit`), 'Submitted to federation')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold">Submit to Federation</button>
          )}
          {isFederation && ['SUBMITTED', 'UNDER_REVIEW'].includes(req.status) && (
            <>
              <button onClick={() => act(() => api.post(`/api/federation/workforce/requirements/${id}/review`, { decision: 'approve' }), 'Approved — matching open')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold">Approve</button>
              <button onClick={() => act(() => api.post(`/api/federation/workforce/requirements/${id}/review`, { decision: 'reject' }), 'Sent back to society')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold">Send back</button>
            </>
          )}
          {isSociety && ['WORK_IN_PROGRESS', 'FULLY_FULFILLED', 'PARTIALLY_FULFILLED'].includes(req.status) && (
            <button onClick={() => act(() => api.post(`/api/society/workforce/requirements/${id}/complete`), 'Marked complete')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold">Mark Complete</button>
          )}
          {isSociety && !['COMPLETED', 'CANCELLED'].includes(req.status) && (
            <button onClick={() => act(() => api.delete(`/api/society/workforce/requirements/${id}`), 'Cancelled')}
              className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-semibold">Cancel</button>
          )}
        </div>
      </div>

      {req.latitude && req.longitude && (
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><MapPin size={16} /> Work site</h2>
          <ServiceMap height={220} center={{ lat: req.latitude, lng: req.longitude }}
            markers={[{ lat: req.latitude, lng: req.longitude, label: req.title, sub: req.location_address, kind: 'request' }]} />
        </div>
      )}

      <div className="bg-white rounded-2xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Worker requirements & AI matching</h2>
          <button onClick={fetchMatches} disabled={loadingMatches}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
            <Sparkles size={15} /> {loadingMatches ? 'Matching...' : 'Run AI Matching'}
          </button>
        </div>
        <div className="space-y-4">
          {req.items?.map((item) => {
            const m = matches.find((x) => x.item?.id === item.id);
            return (
              <div key={item.id} className="border rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-gray-900">{item.service_name}
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      {item.quantity_required} workers • {item.duration_days} days • {item.minimum_experience}+ yrs • {item.priority}
                    </span>
                  </div>
                  {badge(item.status)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Accepted {item.accepted_count}/{item.quantity_required} • Remaining {item.remaining} • {item.worker_days} worker-days
                  {item.skill_requirement && ` • Skill: ${item.skill_requirement}`}
                </div>
                {(item.allocations || []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(item.allocations || []).map((a) => (
                      <span key={a.id} className="inline-flex items-center gap-1.5 text-xs bg-gray-50 border rounded-full px-2.5 py-1">
                        {a.worker_name} {badge(a.status)}
                      </span>
                    ))}
                  </div>
                )}
                {m && (
                  <div className="mt-3 bg-purple-50/60 border border-purple-100 rounded-xl p-3">
                    <p className="text-xs font-semibold text-purple-900 mb-2">Top matches (advisory — federation decides)</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {m.matches.slice(0, 4).map((cand) => (
                        <div key={cand.worker.id} className="bg-white rounded-lg border p-2.5 flex items-center justify-between gap-2">
                          <div className="text-xs">
                            <div className="font-bold text-gray-900">{cand.worker.name} <span className="text-purple-700">({cand.score}%)</span></div>
                            <div className="text-gray-500">{cand.explanation.slice(0, 2).join(' • ')}</div>
                          </div>
                          {(isSociety || isFederation) && (
                            <button onClick={() => allocate(item.id, cand.worker.id)}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-semibold">Allocate</button>
                          )}
                        </div>
                      ))}
                      {m.matches.length === 0 && <p className="text-xs text-gray-400">No eligible workers found.</p>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {progress && (
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Progress & payout estimate</h2>
          <div className="text-sm text-gray-600">
            Accepted <b>{progress.summary.workers_accepted}</b> / {progress.summary.total_workers_required} workers •{' '}
            Remaining <b>{progress.summary.workers_remaining}</b> • Estimated worker payout{' '}
            <b>₹{Number(progress.summary.estimated_worker_payout).toLocaleString('en-IN')}</b> (backend-priced)
          </div>
          <div className="mt-4 space-y-2">
            {progress.timeline.map((t, i) => (
              <div key={i} className="flex gap-3 text-xs text-gray-600">
                <CheckCircle size={14} className="text-emerald-500 mt-0.5" />
                <span>{t.event}{t.at ? ` — ${new Date(t.at).toLocaleString()}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
