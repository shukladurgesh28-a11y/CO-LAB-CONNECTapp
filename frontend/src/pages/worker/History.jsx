import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  History as HistoryIcon,
  Star,
  MapPin,
  Calendar,
  DollarSign,
  Loader2,
  Filter,
  ChevronRight,
  Wrench,
  Clock,
  Search,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';

export default function History() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serviceFilter, setServiceFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/bookings/');
      const data = res.data?.data || [];
      setBookings(data.filter((b) => b.status === 'completed'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const serviceTypes = useMemo(() => {
    const types = new Set(bookings.map((b) => b.serviceName || b.service?.name).filter(Boolean));
    return ['all', ...Array.from(types)];
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const serviceName = b.serviceName || b.service?.name || '';
      if (serviceFilter !== 'all' && serviceName !== serviceFilter) return false;

      const d = new Date(b.completedAt || b.updatedAt || b.createdAt);
      if (dateFilter.start && d < new Date(dateFilter.start)) return false;
      if (dateFilter.end) {
        const end = new Date(dateFilter.end);
        end.setHours(23, 59, 59);
        if (d > end) return false;
      }
      return true;
    });
  }, [bookings, serviceFilter, dateFilter]);

  const renderStars = (rating) => {
    if (!rating) return <span className="text-gray-400 text-sm">No rating</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Service History</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Filter className="w-4 h-4" />
            Filters
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Service Type Filter */}
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              {serviceTypes.map((type) => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Services' : type}
                </option>
              ))}
            </select>

            {/* Date Range */}
            <input
              type="date"
              value={dateFilter.start}
              onChange={(e) => setDateFilter((prev) => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={dateFilter.end}
              onChange={(e) => setDateFilter((prev) => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />

            {(serviceFilter !== 'all' || dateFilter.start || dateFilter.end) && (
              <button
                onClick={() => {
                  setServiceFilter('all');
                  setDateFilter({ start: '', end: '' });
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{filteredBookings.length}</p>
          <p className="text-sm text-gray-500">Completed Jobs</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            ₹{filteredBookings.reduce((s, b) => s + (b.financials?.worker_payout || 0), 0).toFixed(2)}
          </p>
          <p className="text-sm text-gray-500">Total Earned</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-500">
            {filteredBookings.filter((b) => b.rating).length > 0
              ? (
                  filteredBookings.reduce((s, b) => s + (b.rating || 0), 0) /
                  filteredBookings.filter((b) => b.rating).length
                ).toFixed(1)
              : '—'}
          </p>
          <p className="text-sm text-gray-500">Avg. Rating</p>
        </div>
      </div>

      {/* History List */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <HistoryIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No history found</h3>
          <p className="text-gray-500">
            {serviceFilter !== 'all' || dateFilter.start || dateFilter.end
              ? 'No services match your filters.'
              : 'You haven\'t completed any services yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:border-blue-200 hover:shadow-md transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                      <Wrench className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">
                      {booking.service_name || booking.serviceName || booking.service?.name || 'Service'}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {booking.location_address || booking.customerArea || booking.area || 'N/A'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {new Date(booking.completedAt || booking.updatedAt || booking.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="font-semibold text-green-600">
                        ₹{(booking.financials?.worker_payout || 0).toFixed(2)}
                      </span>
                    </span>
                  </div>

                  {booking.rating > 0 && (
                    <div className="mt-3">{renderStars(booking.rating)}</div>
                  )}
                </div>

                <Link
                  to={`/worker/jobs/${booking._id}`}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-700 rounded-lg transition-colors text-sm font-medium shrink-0"
                >
                  View Details
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
