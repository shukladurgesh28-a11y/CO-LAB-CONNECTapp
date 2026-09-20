import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import { CardSkeleton } from '../../motion/primitives';
import { Calendar, Clock, MapPin, ListX } from 'lucide-react';
import { useRealtimeSync } from '../../api/realtime';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const ACTIVE_STATUSES = ['pending', 'reviewing', 'recommended', 'allocated', 'confirmed', 'accepted', 'en_route', 'service_started', 'in_progress'];

export default function Bookings() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const fetchBookings = useCallback(async () => {
    try {
      const params = activeTab !== 'all' ? { status: activeTab } : {};
      const [{ data: bookingsData }, { data: requestsData }] = await Promise.all([
        api.get('/bookings/', { params }),
        api.get('/requests/?limit=50'),
      ]);
      const confirmedBookings = bookingsData?.data || bookingsData?.bookings || [];
      const bookingRequestIds = new Set(confirmedBookings.map((booking) => booking.request_id));
      const requestItems = (requestsData?.data || requestsData?.requests || [])
        .filter((request) => !bookingRequestIds.has(request.id))
        .map((request) => ({
          id: `request-${request.id}`,
          request_id: request.id,
          service_name: request.service_name || 'Service request',
          status: request.status,
          service_date: request.preferred_date,
          time_start: request.preferred_time_start,
          location_address: request.location_address,
          is_request: true,
        }));
      setBookings([...confirmedBookings, ...requestItems]);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useRealtimeSync({
    tables: ['service_requests', 'bookings', 'notifications'],
    onChange: fetchBookings,
  });

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return ACTIVE_STATUSES.includes(b.status);
    return b.status === activeTab;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">My Bookings</h1>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
          <ListX className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 text-lg mb-2">No bookings found</p>
          <p className="text-gray-400 text-sm mb-4">
            {activeTab === 'all'
              ? "You haven't made any bookings yet"
              : `No ${activeTab} bookings`}
          </p>
          <button
            onClick={() => navigate('/customer/services')}
            className="px-5 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all duration-200"
          >
            Browse Services
          </button>
        </div>
      ) : (
        <div key={activeTab} className="cc-enter space-y-4">
          {filteredBookings.map((booking) => (
            <div
              key={booking.id}
              onClick={() => navigate(booking.is_request
                ? `/customer/requests/${booking.request_id}`
                : `/customer/bookings/${booking.id}`)}
              className="cc-card cc-card-hover bg-white rounded-xl p-5 shadow-sm border border-gray-100 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {booking.service_name || booking.serviceName || booking.service_type || booking.service?.name || 'Service'}
                  </h3>
                  {booking.worker_name && <p className="text-sm text-gray-500 mt-0.5">Worker: {booking.worker_name}</p>}
                  {booking.cooperative_name && <p className="text-xs text-gray-400 mt-0.5">{booking.cooperative_name}</p>}
                </div>
                <StatusBadge status={booking.status} size="sm" />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                    {booking.service_date || booking.preferred_date || booking.date || 'TBD'}
                </span>
                {(booking.time_start || booking.preferred_time_start) && (
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {booking.time_start || booking.preferred_time_start}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {booking.location_address || booking.address || 'Location'}
                </span>
              </div>
              {booking.total_amount != null && (
                <p className="text-sm font-medium text-gray-900 mt-2">
                  ₹{booking.total_amount.toLocaleString()}
                </p>
              )}
              {!booking.is_request && (
                <p className="text-xs text-gray-500 mt-1">
                  Payment: {booking.payment_status === 'paid' ? 'Paid' : 'Pending'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
