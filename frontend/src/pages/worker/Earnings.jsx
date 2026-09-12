import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DollarSign,
  Calendar,
  TrendingUp,
  Loader2,
  ArrowUpRight,
  Filter,
  Wallet,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';

function StatsCard({ icon: Icon, label, value, color, bgColor, trend }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgColor}`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
          <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-lg">
            <TrendingUp className="w-3.5 h-3.5" />
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Earnings() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/bookings/');
      const data = res.data?.data || [];
      setBookings(data.filter((b) => b.status === 'completed'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const d = new Date(b.completedAt || b.updatedAt || b.createdAt);
      if (dateFilter.start && d < new Date(dateFilter.start)) return false;
      if (dateFilter.end) {
        const end = new Date(dateFilter.end);
        end.setHours(23, 59, 59);
        if (d > end) return false;
      }
      return true;
    });
  }, [bookings, dateFilter]);

  const totalEarnings = filteredBookings.reduce(
    (sum, b) => sum + (b.financials?.worker_payout || 0),
    0
  );

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const monthlyEarnings = bookings
    .filter((b) => {
      const d = new Date(b.completedAt || b.updatedAt || b.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((sum, b) => sum + (b.financials?.worker_payout || 0), 0);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const weeklyEarnings = bookings
    .filter((b) => {
      const d = new Date(b.completedAt || b.updatedAt || b.createdAt);
      return d >= startOfWeek;
    })
    .reduce((sum, b) => sum + (b.financials?.worker_payout || 0), 0);

  // Chart data: last 6 months
  const chartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const month = d.getMonth();
      const year = d.getFullYear();
      const label = d.toLocaleString('default', { month: 'short' });
      const earnings = bookings
        .filter((b) => {
          const bd = new Date(b.completedAt || b.updatedAt || b.createdAt);
          return bd.getMonth() === month && bd.getFullYear() === year;
        })
        .reduce((sum, b) => sum + (b.financials?.worker_payout || 0), 0);
      months.push({ name: label, earnings: Number(earnings.toFixed(2)) });
    }
    return months;
  }, [bookings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Earnings</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatsCard
          icon={Wallet}
          label="Total Earnings"
          value={`₹${totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        <StatsCard
          icon={DollarSign}
          label="This Month"
          value={`₹${monthlyEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          color="text-green-600"
          bgColor="bg-green-100"
        />
        <StatsCard
          icon={Clock}
          label="This Week"
          value={`₹${weeklyEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          color="text-purple-600"
          bgColor="bg-purple-100"
        />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Earnings Overview</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#9ca3af' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                }}
                formatter={(val) => [`$${val}`, 'Earnings']}
              />
              <Area
                type="monotone"
                dataKey="earnings"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#earningsGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Filter className="w-4 h-4" />
            Filter by date
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={dateFilter.start}
              onChange={(e) => setDateFilter((prev) => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateFilter.end}
              onChange={(e) => setDateFilter((prev) => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {(dateFilter.start || dateFilter.end) && (
              <button
                onClick={() => setDateFilter({ start: '', end: '' })}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
        </div>
        {filteredBookings.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No transactions found</h3>
            <p className="text-gray-500">
              {dateFilter.start || dateFilter.end
                ? 'No transactions in the selected date range.'
                : 'You haven\'t completed any jobs yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer Area
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredBookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(booking.completedAt || booking.updatedAt || booking.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {booking.serviceName || booking.service?.name || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {booking.customerArea || booking.area || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600 text-right">
                      ₹{(booking.totalAmount || booking.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Paid
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
