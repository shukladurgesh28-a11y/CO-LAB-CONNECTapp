import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import api from '../../api/axios';
import RatingStars from '../../components/RatingStars';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  Clock,
  FileText,
  RefreshCw,
  Calendar,
  Filter,
  History as HistoryIcon,
} from 'lucide-react';

export default function History() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await api.get('/history/');
        setHistory(data?.data || data?.history || []);
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filteredHistory = history.filter((item) => {
    if (dateFrom && item.date && new Date(item.date) < new Date(dateFrom)) return false;
    if (dateTo && item.date && new Date(item.date) > new Date(dateTo)) return false;
    if (serviceFilter) {
      const serviceName = (item.service_name || item.service?.name || '').toLowerCase();
      if (!serviceName.includes(serviceFilter.toLowerCase())) return false;
    }
    return true;
  });

  const serviceTypes = [...new Set(history.map((h) => h.service_name || h.service?.name).filter(Boolean))];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Service History</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
          <Filter size={16} />
          Filters
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Service Type</label>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
            >
              <option value="">All Services</option>
              {serviceTypes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* History List */}
      {loading ? (
        <LoadingSpinner message="Loading history..." />
      ) : filteredHistory.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
          <HistoryIcon className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 text-lg mb-2">No history found</p>
          <p className="text-gray-400 text-sm">
            {history.length === 0
              ? "You haven't completed any services yet"
              : 'No results match your filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((item, i) => (
            <div
              key={item.id || i}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {item.service_name || item.service?.name || 'Service'}
                  </h3>
                  {item.worker_name && (
                    <p className="text-sm text-gray-500 mt-0.5">Worker: {item.worker_name}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {item.completed_at || item.date || '—'}
                    </span>
                    {item.amount != null && (
                      <span className="font-medium text-gray-900">₹{item.amount.toLocaleString()}</span>
                    )}
                  </div>
                  {item.rating != null && (
                    <div className="mt-2">
                      <RatingStars rating={item.rating} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      navigate(`/customer/request?service=${item.service_id || ''}`)
                    }
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all duration-200"
                  >
                    <RefreshCw size={14} />
                    Rebook
                  </button>
                  <button
                    onClick={() => navigate(`/customer/invoice/${item.booking_id || item._id}`)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200"
                  >
                    <FileText size={14} />
                    Invoice
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
