import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Inbox, Calendar, CheckCircle, DollarSign, AlertTriangle, Clock, ChevronRight, Flame } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/StatusBadge';
import { PageHero, StatTile, SectionCard, Avatar, safeDate, inr } from '../../components/ds';
import { CardSkeleton } from '../../motion/primitives';

const AVAIL_COLORS = { available: '#10b981', busy: '#f59e0b', offline: '#9ca3af' };

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
      setError('Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-4">
        <CardSkeleton /><CardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">{error}</p>
        <button onClick={fetchDashboardData} className="cc-btn mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
          Retry
        </button>
      </div>
    );
  }

  const availabilityData = dashboardData?.workerAvailability || [];
  const performanceData = dashboardData?.performanceTrend || [];
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const urgentRequests = requests.filter((r) => r.urgency === 'urgent' && r.status === 'pending');
  const recentRequests = requests.slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHero
        tone="blue"
        eyebrow="Society workforce command"
        title={`Command Center${user?.name ? ` — ${user.name.split(' ')[0]}` : ''}`}
        sub="Live queue, verified workforce and AI-assisted allocation in one place."
        cta={[
          { to: '/cooperative/requests', label: `Review queue (${pendingRequests.length})` },
          { to: '/unified-dashboard', label: 'Open full console' },
        ]}
        stats={[
          { label: 'Workers', value: dashboardData?.workers_total || 0, countUp: true },
          { label: 'Pending', value: pendingRequests.length, countUp: true },
          { label: 'Active', value: dashboardData?.active_bookings || 0, countUp: true },
          { label: 'Revenue', value: dashboardData?.total_revenue || 0, countUp: true, format: (v) => inr(Math.round(v)) },
        ]}
      />

      {/* Urgent alert strip */}
      {urgentRequests.length > 0 && (
        <div className="cc-enter flex flex-wrap items-center gap-3 bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-2xl px-5 py-4 shadow-lg shadow-red-600/20">
          <Flame size={22} className="shrink-0" />
          <p className="font-bold text-sm sm:text-base flex-1 min-w-[200px]">
            {urgentRequests.length} urgent request{urgentRequests.length > 1 ? 's' : ''} waiting for allocation
          </p>
          <Link to="/cooperative/requests" className="cc-btn px-4 py-2 bg-white text-red-700 text-sm font-bold rounded-xl">
            Triage now →
          </Link>
        </div>
      )}

      {/* Queue + charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <SectionCard
            title="Live request queue"
            sub="Newest first — click to review, match and allocate"
            action={<Link to="/cooperative/requests" className="text-sm font-semibold text-blue-700 flex items-center gap-1">All <ChevronRight size={14} /></Link>}
          >
            {recentRequests.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Queue is clear. New customer requests will land here.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentRequests.map((r) => (
                  <li key={r.id}>
                    <Link to={`/cooperative/requests/${r.id}`} className="flex items-center gap-3 py-3 group">
                      <Avatar name={r.customer_name || r.customerName || 'Customer'} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700">
                          {r.service_name || r.serviceName || 'Service request'}
                        </span>
                        <span className="block text-xs text-gray-500 truncate">
                          {(r.customer_name || r.customerName || 'Customer')} • {r.location_address || r.customerArea || 'Pune'}
                        </span>
                      </span>
                      <StatusBadge status={r.urgency === 'urgent' ? 'urgent' : r.status} size="sm" />
                      <span className="text-[11px] text-gray-400 whitespace-nowrap">{safeDate(r.created_at || r.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Worker availability">
            {availabilityData.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-gray-400 text-sm gap-1">
                <Users size={28} />
                No availability snapshot yet
              </div>
            ) : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={availabilityData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={4} dataKey="value">
                      {availabilityData.map((entry, i) => (
                        <Cell key={i} fill={AVAIL_COLORS[entry.name?.toLowerCase()] || ['#3b82f6', '#10b981', '#f59e0b'][i % 3]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Performance trend">
            {performanceData.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-gray-400 text-sm gap-1">
                <Clock size={28} />
                Completions will chart here
              </div>
            ) : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef0ff" />
                    <XAxis dataKey="day" stroke="#6b7280" fontSize={11} />
                    <YAxis stroke="#6b7280" fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="completed" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Workforce strip */}
      <SectionCard
        title="Workforce at a glance"
        action={<Link to="/cooperative/workers" className="text-sm font-semibold text-blue-700">Manage</Link>}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile label="Total workers" value={dashboardData?.workers_total || 0} />
          <StatTile label="Verified" value={dashboardData?.verified_workers ?? dashboardData?.workers_verified ?? 0} />
          <StatTile label="Completed jobs" value={dashboardData?.completed_bookings || 0} />
          <StatTile label="Revenue" value={dashboardData?.total_revenue || 0} money />
        </div>
      </SectionCard>
    </div>
  );
};

export default Dashboard;
