import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Inbox, Calendar, CheckCircle, DollarSign, AlertTriangle, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';

const StatsCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {trend && (
          <p className={`text-xs mt-2 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last week
          </p>
        )}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

const UrgencyBadge = ({ urgency }) => {
  const colors = {
    urgent: 'bg-red-100 text-red-700 animate-pulse',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[urgency] || colors.low}`}>
      {urgency}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.pending}`}>
      {status?.replace('_', ' ')}
    </span>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [dashboardData, setDashboardData] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, requestsRes] = await Promise.all([
        api.get('/api/cooperative/dashboard'),
        api.get('/api/requests', { params: { status: 'all' } }),
      ]);
      setDashboardData(dashboardRes.data?.data || dashboardRes.data);
      setRequests(requestsRes.data?.data || requestsRes.data?.requests || []);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const availabilityData = dashboardData?.workerAvailability || [];
  const performanceData = dashboardData?.performanceTrend || [];

  const recentRequests = requests.slice(0, 5);
  const urgentRequests = requests.filter(r => r.urgency === 'urgent' && r.status === 'pending');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-gray-200 rounded-xl"></div>
            <div className="h-80 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Cooperative Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {user?.name || 'Admin'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <StatsCard
            title="Total Workers"
            value={dashboardData?.workers_total || 0}
            icon={Users}
            color="bg-blue-500"
            trend={dashboardData?.workerTrend}
          />
          <StatsCard
            title="Pending Requests"
            value={dashboardData?.pending_requests || 0}
            icon={Inbox}
            color="bg-yellow-500"
            trend={dashboardData?.pendingTrend}
          />
          <StatsCard
            title="Active Bookings"
            value={dashboardData?.active_bookings || 0}
            icon={Calendar}
            color="bg-green-500"
            trend={dashboardData?.activeTrend}
          />
          <StatsCard
            title="Completed"
            value={dashboardData?.completed_bookings || 0}
            icon={CheckCircle}
            color="bg-emerald-500"
            trend={dashboardData?.completedTrend}
          />
          <StatsCard
            title="Revenue"
            value={`₹${(dashboardData?.total_revenue || 0).toLocaleString()}`}
            icon={DollarSign}
            color="bg-purple-500"
            trend={dashboardData?.revenueTrend}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Worker Availability</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={availabilityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {availabilityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Trend</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {urgentRequests.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-red-900">Urgent Alerts</h2>
              <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                {urgentRequests.length}
              </span>
            </div>
            <div className="space-y-3">
              {urgentRequests.map((request) => (
                <Link
                  key={request.id}
                  to={`/cooperative/requests/${request.id}`}
                  className="flex items-center justify-between bg-white p-4 rounded-lg border border-red-200 hover:border-red-300 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{request.serviceName}</p>
                      <p className="text-sm text-gray-500">{request.customerArea}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <UrgencyBadge urgency="urgent" />
                    <StatusBadge status={request.status} />
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Requests</h2>
            <Link
              to="/cooperative/requests"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentRequests.map((request) => (
              <Link
                key={request.id}
                to={`/cooperative/requests/${request.id}`}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{request.serviceName}</p>
                    <p className="text-sm text-gray-500">{request.customerArea}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <UrgencyBadge urgency={request.urgency} />
                  <StatusBadge status={request.status} />
                  <span className="text-xs text-gray-400">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
            {recentRequests.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No recent requests
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;