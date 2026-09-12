import { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  Gauge,
  Star,
  Handshake,
  BarChart3,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart as ReBarChart,
  Cell,
} from 'recharts';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';
import StatsCard from '../../components/StatsCard';
import LoadingSpinner from '../../components/LoadingSpinner';

const BAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function WorkforceOverview() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [workforceData, setWorkforceData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [workRes, anaRes] = await Promise.allSettled([
        api.get('/federation/workforce'),
        api.get('/analytics/workforce'),
      ]);

      if (workRes.status === 'fulfilled') setWorkforceData(workRes.value.data?.data || workRes.value.data);
      if (anaRes.status === 'fulfilled') setAnalyticsData(anaRes.value.data?.data || anaRes.value.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load workforce data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading workforce overview..." />;

  const stats = workforceData?.stats || analyticsData?.stats || {
    totalWorkers: workforceData?.total_workers,
    availableNow: workforceData?.available_workers,
  };
  const workersByCoop = workforceData?.workersByCooperative || workforceData?.by_cooperative || analyticsData?.workersByCooperative || [];
  const skillDist = workforceData?.skillDistribution || analyticsData?.skillDistribution || [];
  const availabilityByDay = workforceData?.availabilityByDay || analyticsData?.availabilityByDay || [];
  const utilizationByCoop = workforceData?.utilizationByCooperative || analyticsData?.utilizationByCooperative || [];
  const crossCoopCapacity = workforceData?.crossCooperativeCapacity || analyticsData?.crossCooperativeCapacity || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Workforce Overview</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={Users}
          label="Total Workers"
          value={stats.totalWorkers ?? 0}
          color="blue"
        />
        <StatsCard
          icon={UserCheck}
          label="Available Now"
          value={stats.availableNow ?? 0}
          color="green"
        />
        <StatsCard
          icon={Gauge}
          label="Average Utilization"
          value={`${stats.avgUtilization ?? 0}%`}
          color="orange"
        />
        <StatsCard
          icon={Star}
          label="Average Rating"
          value={(stats.avgRating ?? 0).toFixed(1)}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workers by Cooperative Stacked Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900">Workers by Cooperative</h2>
          </div>
          {workersByCoop.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={workersByCoop}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="cooperative" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Legend />
                <Bar dataKey="available" stackId="a" fill="#10b981" name="Available" radius={[0, 0, 0, 0]} />
                <Bar dataKey="busy" stackId="a" fill="#f59e0b" name="Busy" radius={[0, 0, 0, 0]} />
                <Bar dataKey="offline" stackId="a" fill="#e5e7eb" name="Offline" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-400">
              No workforce distribution data
            </div>
          )}
        </div>

        {/* Skill Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Skill Distribution</h2>
          {skillDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={skillDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="skill" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {skillDist.map((_, idx) => (
                    <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-400">
              No skill distribution data
            </div>
          )}
        </div>
      </div>

      {/* Availability Patterns */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-cyan-500" />
          <h2 className="text-lg font-semibold text-gray-900">Availability Patterns</h2>
        </div>
        {availabilityByDay.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <ReBarChart data={availabilityByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                }}
              />
              <Bar dataKey="available" fill="#6366f1" radius={[4, 4, 0, 0]} name="Workers Available" />
            </ReBarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[280px] text-gray-400">
            No availability pattern data
          </div>
        )}
      </div>

      {/* Utilization by Cooperative Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Utilization by Cooperative</h2>
        {utilizationByCoop.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cooperative</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Workers</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Utilization %</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Avg Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {utilizationByCoop.map((coop, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {coop.cooperative || coop.name}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-900">{coop.workers}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              (coop.utilization || 0) >= 80
                                ? 'bg-green-500'
                                : (coop.utilization || 0) >= 50
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(coop.utilization || 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 w-10">
                          {coop.utilization || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-amber-600 font-medium">
                        {(coop.avgRating || 0).toFixed(1)} ★
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">No utilization data available</p>
        )}
      </div>

      {/* Cross-Cooperative Capacity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Handshake size={18} className="text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-900">Cross-Cooperative Capacity</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Cooperatives that can share workers during peak demand periods
        </p>
        {crossCoopCapacity.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {crossCoopCapacity.map((pair, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {pair.cooperativeA || pair.source} ↔ {pair.cooperativeB || pair.target}
                    </p>
                    <p className="text-xs text-gray-500">{pair.sharedWorkers || pair.capacity} workers available</p>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    (pair.compatibility || 0) >= 80
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {pair.compatibility || 0}% match
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">
            No cross-cooperative capacity data available
          </p>
        )}
      </div>
    </div>
  );
}
