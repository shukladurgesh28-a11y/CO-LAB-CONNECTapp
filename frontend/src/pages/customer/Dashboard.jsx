import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import {
  Calendar,
  CheckCircle,
  DollarSign,
  Star,
  Plus,
  List,
  Clock,
  MapPin,
} from 'lucide-react';

const STAT_CARDS = [
  { label: 'Total Bookings', icon: Calendar, color: 'bg-blue-500', key: 'total' },
  { label: 'Completed', icon: CheckCircle, color: 'bg-green-500', key: 'completed' },
  { label: 'Amount Spent', icon: DollarSign, color: 'bg-purple-500', key: 'spent' },
  { label: 'Avg Rating', icon: Star, color: 'bg-yellow-500', key: 'rating' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [bookings, setBookings] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, spent: 0, rating: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookingsRes, historyRes] = await Promise.all([
          api.get('/bookings/'),
          api.get('/history/'),
        ]);
        const allBookings = bookingsRes.data?.data || bookingsRes.data?.bookings || [];
        const completed = allBookings.filter((b) => b.status === 'completed');
        const totalSpent = completed.reduce((sum, b) => sum + (b.total_amount || b.amount || 0), 0);
        const ratings = completed.filter((b) => b.rating);
        const avgRating = ratings.length ? ratings.reduce((s, b) => s + b.rating, 0) / ratings.length : 0;

        setBookings(allBookings);
        setHistory(historyRes.data?.data || historyRes.data?.history || []);
        setStats({
          total: allBookings.length,
          completed: completed.length,
          spent: totalSpent,
          rating: avgRating,
        });
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeBookings = bookings.filter((b) => !['completed', 'cancelled'].includes(b.status)).slice(0, 5);
  const recentActivity = history.slice(0, 5);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Hello, {user?.name || 'there'} 👋
        </h1>
        <p className="text-gray-500 mt-1">{today}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map((card) => {
          let value = stats[card.key];
          if (card.key === 'spent') value = `₹${value.toLocaleString()}`;
          else if (card.key === 'rating') value = value > 0 ? value.toFixed(1) : '—';
          return (
            <div key={card.key} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`${card.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                  <card.icon size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{card.label}</p>
                  <p className="text-xl font-bold text-gray-900">{value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => navigate('/customer/services')}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all duration-200"
        >
          <Plus size={18} />
          Request Service
        </button>
        <button
          onClick={() => navigate('/customer/bookings')}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200"
        >
          <List size={18} />
          View Bookings
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Bookings */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Bookings</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : activeBookings.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
              <Calendar className="mx-auto text-gray-300 mb-3" size={40} />
              <p className="text-gray-500">No active bookings</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeBookings.map((booking) => (
                <div
                  key={booking._id}
                  onClick={() => navigate(`/customer/bookings/${booking._id}`)}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">
                      {booking.service_type || booking.service?.name || 'Service'}
                    </h3>
                    <StatusBadge status={booking.status} size="sm" />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {booking.preferred_date || booking.date || 'TBD'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {booking.address || 'Location'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
              <Clock className="mx-auto text-gray-300 mb-3" size={40} />
              <p className="text-gray-500">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item, i) => (
                <div
                  key={item._id || i}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 text-sm">
                      {item.service_type || item.service?.name || 'Service'}
                    </h3>
                    <span className="text-xs text-gray-400">
                      {item.completed_at || item.date || ''}
                    </span>
                  </div>
                  {item.worker_name && (
                    <p className="text-xs text-gray-500 mt-1">Worker: {item.worker_name}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
