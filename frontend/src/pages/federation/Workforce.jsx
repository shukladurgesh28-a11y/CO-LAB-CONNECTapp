import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Users, CheckCircle, Undo2 } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  SUBMITTED: 'bg-yellow-100 text-yellow-700', UNDER_REVIEW: 'bg-orange-100 text-orange-700',
  MATCHING: 'bg-purple-100 text-purple-700', PARTIALLY_FULFILLED: 'bg-amber-100 text-amber-800',
  FULLY_FULFILLED: 'bg-blue-100 text-blue-700', WORK_IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700', CANCELLED: 'bg-gray-100 text-gray-400',
};

export default function FederationWorkforce() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/federation/workforce/requirements');
      setRows(res.data?.data || []);
    } catch (err) {
      toast.error(err.userMessage || 'Failed to load requirements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const review = async (id, decision) => {
    try {
      await api.post(`/api/federation/workforce/requirements/${id}/review`, { decision });
      toast.success(decision === 'approve' ? 'Approved — matching open' : 'Sent back to society');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Review failed');
    }
  };

  if (loading) return <Loader2 className="mx-auto mt-20 animate-spin text-indigo-600" />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Society Workforce Requirements</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">Review society requests, open AI matching, and oversee fulfillment</p>
      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" /> No requirements submitted yet.
        </div>
      ) : (
        <div className="grid gap-4">
          {rows.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link to={`/workforce/${r.id}`} className="font-bold text-gray-900 hover:text-indigo-700">
                    #{r.id} — {r.title}
                  </Link>
                  <p className="text-xs text-gray-500 mt-1">
                    {r.cooperative_name} • {r.total_workers_required} workers • {r.workers_accepted} accepted • {r.workers_remaining} remaining
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[r.status] || 'bg-gray-100 text-gray-600'}`}>
                  {r.status?.replaceAll('_', ' ')}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Link to={`/workforce/${r.id}`}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold">Open & Allocate</Link>
                {['SUBMITTED', 'UNDER_REVIEW'].includes(r.status) && (
                  <>
                    <button onClick={() => review(r.id, 'approve')}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1">
                      <CheckCircle size={13} /> Approve
                    </button>
                    <button onClick={() => review(r.id, 'reject')}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1">
                      <Undo2 size={13} /> Send back
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
