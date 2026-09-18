import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Clock,
  MapPin,
  Calendar,
  Loader2,
  ChevronRight,
  Wrench,
  Navigation,
  Play,
  CheckCircle,
  Filter,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';
import { useRealtimeSync } from '../../api/realtime';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'New' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  en_route: 'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-orange-100 text-orange-700',
  service_started: 'bg-orange-100 text-orange-700',
  accepted: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  en_route: 'En Route',
  in_progress: 'In Progress',
  service_started: 'Service Started',
  accepted: 'Accepted',
  rejected: 'Rejected',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const displayStatus = (status) => status === 'in_progress' ? 'service_started' : status;

export default function AssignedJobs() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [respondingId, setRespondingId] = useState(null);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/bookings/');
      const data = res.data?.data || res.data?.bookings || [];
      setBookings(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await api.get('/api/workforce/my-assignments');
      setAssignments(res.data?.data || []);
    } catch {
      /* workforce feature may be empty; bookings remain authoritative */
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    fetchAssignments();
  }, [fetchBookings, fetchAssignments]);

  const respondAssignment = async (allocId, decision) => {
    setRespondingId(allocId);
    try {
      await api.post(`/api/workforce/allocations/${allocId}/${decision}`);
      setAssignments((prev) => prev.map((a) => (a.id === allocId ? { ...a, status: decision === 'accept' ? 'accepted' : 'declined' } : a)));
      toast.success(decision === 'accept' ? 'Assignment accepted' : 'Assignment declined');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to respond');
    } finally {
      setRespondingId(null);
    }
  };

  useRealtimeSync({
    tables: ['bookings', 'allocations', 'notifications'],
    onChange: fetchBookings,
  });

  const handleStatusUpdate = async (bookingId, newStatus, e) => {
    e.preventDefault();
    e.stopPropagation();
    setUpdatingId(bookingId);
    try {
      await api.patch(`/api/bookings/${bookingId}/status`, { status: newStatus });
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );
      toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'in_progress') return ['en_route', 'in_progress', 'service_started'].includes(b.status);
    if (activeTab === 'pending') return ['pending', 'confirmed'].includes(b.status);
    return b.status === activeTab;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Assigned Jobs</h1>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            {tab.key !== 'all' && (
              <span className="ml-1.5 text-xs opacity-75">
                ({tab.key === 'in_progress'
                  ? bookings.filter((b) => ['en_route', 'in_progress'].includes(b.status)).length
                  : tab.key === 'pending'
                  ? bookings.filter((b) => ['pending', 'confirmed'].includes(b.status)).length
                  : bookings.filter((b) => b.status === tab.key).length})
              </span>
            )}
            {tab.key === 'all' && (
              <span className="ml-1.5 text-xs opacity-75">({bookings.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Job Cards */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No jobs found</h3>
          <p className="text-gray-500">
            {activeTab === 'all'
              ? "You don't have any assigned jobs yet."
              : `No ${STATUS_LABELS[activeTab]?.toLowerCase()} jobs.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((job) => (
              <Link
              key={job.id}
              to={`/worker/jobs/${job.id}`}
              className="block bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:border-blue-200 hover:shadow-md transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <Wrench className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {job.service_name || job.serviceName || job.service?.name || 'Service'}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          STATUS_STYLES[job.status] || STATUS_STYLES.pending
                        }`}
                      >
                        {STATUS_LABELS[displayStatus(job.status)] || job.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {job.location_address || job.customerArea || job.area || 'N/A'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {new Date(job.service_date || job.scheduledDate || job.date || job.created_at).toLocaleDateString()}
                    </span>
                    {(job.time_start || job.scheduledTime) && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {job.time_start || job.scheduledTime}
                      </span>
                    )}
                    {(job.location_address || job.address) && (
                      <span className="flex items-center gap-1.5 truncate">
                        <Navigation className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{job.location_address || job.address}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Action buttons based on status */}
                  {job.status === 'confirmed' && (
                    <>
                      <button
                        onClick={(e) => handleStatusUpdate(job.id, 'accepted', e)}
                        disabled={updatingId === job.id}
                        className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Accept
                      </button>
                      <button
                        onClick={(e) => handleStatusUpdate(job.id, 'rejected', e)}
                        disabled={updatingId === job.id}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={(e) => handleStatusUpdate(job.id, 'en_route', e)}
                        disabled={updatingId === job.id}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {updatingId === job.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Navigation className="w-4 h-4" />
                        )}
                        En Route
                      </button>
                      <button
                        onClick={(e) => handleStatusUpdate(job.id, 'in_progress', e)}
                        disabled={updatingId === job.id}
                        className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        <Play className="w-4 h-4" />
                        Start Service
                      </button>
                    </>
                  )}

                  {job.status === 'accepted' && (
                    <button
                      onClick={(e) => handleStatusUpdate(job.id, 'en_route', e)}
                      disabled={updatingId === job.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      <Navigation className="w-4 h-4" />
                      En Route
                    </button>
                  )}

                  {job.status === 'en_route' && (
                    <button
                      onClick={(e) => handleStatusUpdate(job.id, 'in_progress', e)}
                      disabled={updatingId === job.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {updatingId === (job.id ?? job._id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      Start Service
                    </button>
                  )}

                  {job.status === 'in_progress' && (
                    <button
                        onClick={(e) => handleStatusUpdate(job.id, 'completed', e)}
                        disabled={updatingId === job.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {updatingId === (job.id ?? job._id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Complete
                    </button>
                  )}

                  <ChevronRight className="w-5 h-5 text-gray-300 hidden sm:block" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Society workforce assignments */}
      {assignments.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Society Workforce Assignments</h2>
          <div className="grid gap-3">
            {assignments.map((a) => (
              <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-900">{a.service_name || 'Work assignment'}</div>
                  <div className="text-xs text-gray-500">
                    Requirement #{a.requirement_id} • {a.start_date || ''}{a.end_date ? ` → ${a.end_date}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 capitalize">{a.status}</span>
                  {a.status === 'offered' && (
                    <>
                      <button onClick={() => respondAssignment(a.id, 'accept')} disabled={respondingId === a.id}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">Accept</button>
                      <button onClick={() => respondAssignment(a.id, 'decline')} disabled={respondingId === a.id}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium disabled:opacity-50">Decline</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
