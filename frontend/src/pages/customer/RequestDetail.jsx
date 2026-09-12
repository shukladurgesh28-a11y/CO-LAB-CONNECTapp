import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Loader2, MapPin } from 'lucide-react';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';
import { useRealtimeSync } from '../../api/realtime';

export default function RequestDetail() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRequest = useCallback(async () => {
    try {
      const response = await api.get(`/requests/${id}`);
      setRequest(response.data?.data || response.data);
    } catch (error) {
      toast.error(error.userMessage || 'Unable to load your service request.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  useRealtimeSync({
    tables: ['service_requests', 'allocations', 'bookings', 'notifications'],
    onChange: fetchRequest,
  });

  if (loading) return <Loader2 className="mx-auto mt-20 animate-spin text-indigo-600" />;
  if (!request) return <p className="p-8 text-center text-gray-500">Request not found.</p>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/customer/bookings" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft size={18} /> Back to bookings
      </Link>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Request #{request.id}</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{request.service_name || `Service #${request.service_id}`}</h1>
          </div>
          <StatusBadge status={request.status} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 text-sm text-gray-600">
          <p className="flex gap-2"><MapPin size={16} />{request.location_address || 'Location not provided'}</p>
          <p className="flex gap-2"><Calendar size={16} />{request.preferred_date || 'Date not set'}</p>
          <p className="flex gap-2"><Clock size={16} />{request.preferred_time_start || 'Time not set'}</p>
          <p>Urgency: <span className="font-medium capitalize">{request.urgency}</span></p>
        </div>
        {request.description && <p className="mt-6 pt-6 border-t border-gray-100 text-gray-700">{request.description}</p>}
        <p className="mt-6 text-sm text-gray-500">Your cooperative will review this request and assign a verified worker.</p>
      </div>
    </div>
  );
}