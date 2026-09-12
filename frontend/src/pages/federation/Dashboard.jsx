import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  Inbox,
  CheckCircle,
  DollarSign,
  ArrowRight,
  Clock,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';
import StatsCard from '../../components/StatsCard';
import LoadingSpinner from '../../components/LoadingSpinner';

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const { data: res } = await api.get('/federation/dashboard');
      setData(res?.data || res);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading federation dashboard..." />;
  if (!data) return <div className="text-center py-20 text-gray-500">No data available</div>;

  const stats = {
    totalCooperatives: data.total_cooperatives,
    totalWorkers: data.total_workers,
    totalRequests: data.total_requests,
    completedServices: data.completed_bookings,
    revenue: data.total_revenue,
  };
  const cooperativePerformance = data.cooperativePerformance || [];
  const regionalDemand = data.regionalDemand || [];
  const workforceDistribution = data.workforceDistribution || [];
  const recentActivity = data.recentActivity || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Federation Dashboard
          </h1>
          {data.federations?.[0]?.name && (
            <p className="text-gray-500 text-sm mt-1">{data.federations[0].name}</p>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          icon={Building2}
          label="Total Cooperatives"
          value={stats.totalCooperatives ?? 0}
          color="blue"
          trend={stats.cooperativesTrend}
        />
        <StatsCard
          icon={Users}
          label="Total Workers"
          value={stats.totalWorkers ?? 0}
          color="green"
          trend={stats.workersTrend}
        />
        <StatsCard
          icon={Inbox}
          label="Total Requests"
          value={stats.totalRequests ?? 0}
          color="orange"
          trend={stats.requestsTrend}
        />
        <StatsCard
          icon={CheckCircle}
          label="Completed"
          value={stats.completedServices ?? 0}
          color="indigo"
          trend={stats.completedTrend}
        />
        <StatsCard
          icon={DollarSign}
          label="Revenue"
          value={`$${(stats.revenue ?? 0).toLocaleString()}`}
          color="purple"
          trend={stats.revenueTrend}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cooperative Performance Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Cooperative Performance
          </h2>
          {cooperativePerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={cooperativePerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="completed" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[320px] text-gray-400">
              No performance data
            </div>
          )}
        </div>

        {/* Regional Demand Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Regional Demand Overview
          </h2>
          <div className="space-y-4">
            {regionalDemand.length > 0 ? (
              regionalDemand.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{item.category || item.name}</p>
                    <p className="text-xs text-gray-500">{item.region || item.area}</p>
                  </div>
                  <span className="text-lg font-bold text-indigo-600">{item.count}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm text-center py-8">No demand data available</p>
            )}
          </div>
          {regionalDemand.length > 3 && (
            <Link
              to="/federation/demand"
              className="mt-4 flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View all regions <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workforce Distribution Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Workforce Distribution
          </h2>
          {workforceDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={workforceDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="workers"
                  nameKey="cooperative"
                  label={({ cooperative, percent }) =>
                    `${cooperative} (${(percent * 100).toFixed(0)}%)`
                  }
                  labelLine={{ strokeWidth: 1 }}
                >
                  {workforceDistribution.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              No distribution data
            </div>
          )}
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Activity
          </h2>
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.slice(0, 5).map((event, idx) => (
                <div key={idx} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="mt-0.5">
                    {event.type === 'completed' ? (
                      <CheckCircle size={16} className="text-emerald-500" />
                    ) : event.type === 'new' || event.type === 'created' ? (
                      <Inbox size={16} className="text-blue-500" />
                    ) : event.type === 'revenue' ? (
                      <DollarSign size={16} className="text-purple-500" />
                    ) : (
                      <Clock size={16} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{event.message || event.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {event.cooperative || event.source}
                      {event.timestamp && ` • ${new Date(event.timestamp).toLocaleString()}`}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm text-center py-8">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
