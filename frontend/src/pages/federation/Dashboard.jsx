import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  Inbox,
  CheckCircle,
  ArrowRight,
  Clock,
  BadgeCheck,
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
import { PageHero, SectionCard, StatTile, inr, safeDate } from '../../components/ds';
import { CardSkeleton } from '../../motion/primitives';

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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-4">
        <CardSkeleton /><CardSkeleton />
      </div>
    );
  }
  if (!data) return <div className="text-center py-20 text-gray-500">No data available</div>;

  const cooperativePerformance = data.cooperativePerformance || [];
  const regionalDemand = data.regionalDemand || [];
  const workforceDistribution = data.workforceDistribution || [];
  const recentActivity = data.recentActivity || [];
  const fedName = data.federations?.[0]?.name || 'Federation network';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHero
        tone="violet"
        eyebrow="Federation oversight"
        title={fedName}
        sub={`Coordinating ${data.total_cooperatives ?? 0} cooperatives, ${data.total_workers ?? 0} workers and ${data.total_requests ?? 0} service requests.`}
        cta={[
          { to: '/federation/cooperatives', label: 'Manage societies' },
          { to: '/federation/demand', label: 'Regional demand' },
        ]}
        stats={[
          { label: 'Societies', value: data.total_cooperatives ?? 0, countUp: true },
          { label: 'Workers', value: data.total_workers ?? 0, countUp: true },
          { label: 'Requests', value: data.total_requests ?? 0, countUp: true },
          { label: 'Revenue', value: data.total_revenue ?? 0, countUp: true, format: (v) => inr(Math.round(v)) },
        ]}
      />

      {/* Society comparison */}
      <SectionCard
        title="Society scoreboard"
        sub="Completed vs pending workload per cooperative"
        action={<Link to="/federation/cooperatives" className="text-sm font-semibold text-violet-700 flex items-center gap-1">All societies <ArrowRight size={14} /></Link>}
      >
        {cooperativePerformance.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cooperativePerformance} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0eefc" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="completed" fill="#7c3aed" radius={[0, 4, 4, 0]} name="Completed" />
                <Bar dataKey="pending" fill="#fbbf24" radius={[0, 4, 4, 0]} name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-10 text-center">
            <Building2 className="mx-auto text-violet-200 mb-2" size={36} />
            <p className="text-sm text-gray-500">Per-society performance will appear once jobs complete.</p>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Demand leaders */}
        <SectionCard
          title="Demand leaders"
          action={<Link to="/federation/demand" className="text-sm font-semibold text-violet-700">Region view</Link>}
        >
          {regionalDemand.length > 0 ? (
            <ul className="space-y-2.5">
              {regionalDemand.slice(0, 4).map((item, idx) => (
                <li key={idx} className="flex items-center justify-between p-3 rounded-xl bg-violet-50/60 border border-violet-100">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{item.category || item.name}</p>
                    <p className="text-xs text-gray-500">{item.region || item.area || ''}</p>
                  </div>
                  <span className="text-lg font-extrabold text-violet-700">{item.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No demand signals yet</p>
          )}
        </SectionCard>

        {/* Workforce mix */}
        <SectionCard title="Workforce mix">
          {workforceDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={workforceDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}
                  dataKey="workers" nameKey="cooperative">
                  {workforceDistribution.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-10 text-center">
              <Users className="mx-auto text-violet-200 mb-2" size={36} />
              <p className="text-sm text-gray-500">Workforce split will appear here.</p>
            </div>
          )}
        </SectionCard>

        {/* Activity */}
        <SectionCard title="Network activity">
          {recentActivity.length > 0 ? (
            <ul className="space-y-2.5">
              {recentActivity.slice(0, 5).map((event, idx) => (
                <li key={idx} className="flex gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                  <BadgeCheck size={15} className="text-violet-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-900 truncate">{event.message || event.description}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {[event.cooperative || event.source, event.timestamp ? safeDate(event.timestamp) : null].filter(Boolean).join(' • ')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-10 text-center">
              <Clock className="mx-auto text-violet-200 mb-2" size={36} />
              <p className="text-sm text-gray-500">Quiet across the network.</p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Completed services" value={data.completed_bookings ?? 0} />
        <StatTile label="Pending requests" value={(data.total_requests ?? 0) - (data.completed_bookings ?? 0)} />
        <StatTile label="Network revenue" value={data.total_revenue ?? 0} money />
        <StatTile label="Avg per society" value={data.total_cooperatives ? Math.round((data.total_requests ?? 0) / data.total_cooperatives) : 0} sub="requests / society" />
      </div>
    </div>
  );
}
