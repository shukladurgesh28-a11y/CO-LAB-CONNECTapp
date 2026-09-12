import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Loader2, Send } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  open: 'bg-red-100 text-red-700',
  under_review: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
  rejected: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

export default function Disputes() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isAdmin = ['cooperative_admin', 'federation_admin', 'platform_admin'].includes(user?.role);
  const [disputes, setDisputes] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    booking_id: searchParams.get('booking_id') || '',
    category: 'service_quality',
    description: '',
  });
  const [resolution, setResolution] = useState({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const requests = [api.get('/disputes')];
      if (!isAdmin) requests.push(api.get('/bookings'));
      const responses = await Promise.all(requests);
      setDisputes(responses[0].data?.data || []);
      if (!isAdmin) setBookings(responses[1].data?.data || []);
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to load disputes.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const submitDispute = async (event) => {
    event.preventDefault();
    if (!form.description.trim()) return;
    setSubmitting(true);
    try {
      const response = await api.post('/disputes', {
        ...form,
        booking_id: form.booking_id || undefined,
      });
      setDisputes((current) => [response.data?.data || response.data, ...current]);
      setForm((current) => ({ ...current, description: '' }));
      toast.success('Dispute submitted for cooperative review.');
    } catch (requestError) {
      toast.error(requestError.userMessage || 'Unable to submit dispute.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateDispute = async (disputeId, status) => {
    try {
      const response = await api.patch(`/disputes/${disputeId}`, {
        status,
        resolution: resolution[disputeId] || undefined,
      });
      setDisputes((current) => current.map((item) => item.id === disputeId ? (response.data?.data || response.data) : item));
      toast.success(`Dispute marked ${status.replace('_', ' ')}.`);
    } catch (requestError) {
      toast.error(requestError.userMessage || 'Unable to update dispute.');
    }
  };

  if (loading) return <Loader2 className="mx-auto mt-20 animate-spin text-indigo-600" />;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">CO-LAB CONNECT</p>
        <h1 className="text-3xl font-bold text-gray-900 mt-1">{isAdmin ? 'Dispute Review' : 'My Disputes'}</h1>
        <p className="text-gray-500 mt-2">{isAdmin ? 'Review concerns and record a cooperative resolution.' : 'Report a service concern and follow its resolution.'}</p>
      </div>

      {!isAdmin && (
        <form onSubmit={submitDispute} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Report a Problem</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <select value={form.booking_id} onChange={(event) => setForm({ ...form, booking_id: event.target.value })} className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
              <option value="">Select a booking (optional)</option>
              {bookings.map((booking) => <option key={booking.id} value={booking.id}>#{booking.id} {booking.service_name || 'Service'}</option>)}
            </select>
            <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
              <option value="service_quality">Service quality</option>
              <option value="payment">Payment</option>
              <option value="worker_conduct">Worker conduct</option>
              <option value="safety">Safety</option>
              <option value="other">Other</option>
            </select>
          </div>
          <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required rows={4} placeholder="Describe what happened" className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
          <button disabled={submitting} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Send size={16} />{submitting ? 'Submitting...' : 'Submit Dispute'}</button>
        </form>
      )}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6">{error}</div>}
      {disputes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-500"><AlertTriangle className="mx-auto mb-3 text-gray-400" />No disputes to review.</div>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => (
            <article key={dispute.id} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-xs text-gray-400">Dispute #{dispute.id}{dispute.booking_id ? ` · Booking #${dispute.booking_id}` : ''}</p><h2 className="mt-1 font-semibold text-gray-900 capitalize">{dispute.category.replace('_', ' ')}</h2></div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[dispute.status] || STATUS_STYLES.open}`}>{dispute.status.replace('_', ' ')}</span>
              </div>
              <p className="mt-4 text-sm text-gray-700">{dispute.description}</p>
              {dispute.resolution && <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800"><strong>Resolution:</strong> {dispute.resolution}</p>}
              {isAdmin && !['resolved', 'rejected', 'cancelled'].includes(dispute.status) && (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input value={resolution[dispute.id] || ''} onChange={(event) => setResolution({ ...resolution, [dispute.id]: event.target.value })} placeholder="Resolution notes" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <button onClick={() => updateDispute(dispute.id, 'under_review')} className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-800">Review</button>
                  <button onClick={() => updateDispute(dispute.id, 'resolved')} className="inline-flex items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white"><CheckCircle size={15} />Resolve</button>
                  <button onClick={() => updateDispute(dispute.id, 'rejected')} className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700">Reject</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
