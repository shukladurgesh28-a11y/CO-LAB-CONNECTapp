import { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Medal,
  TrendingUp,
  Clock,
  CheckCircle,
  BarChart3,
  Lightbulb,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const COOP_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const MEDAL_STYLES = {
  1: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  2: 'bg-gray-100 text-gray-600 border-gray-300',
  3: 'bg-orange-100 text-orange-700 border-orange-300',
};

export default function Performance() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'asc' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [perfRes, anaRes] = await Promise.allSettled([
        api.get('/federation/performance'),
        api.get('/analytics/workforce'),
      ]);

      if (perfRes.status === 'fulfilled') setPerformanceData(perfRes.value.data?.data || perfRes.value.data);
      if (anaRes.status === 'fulfilled') setAnalyticsData(anaRes.value.data?.data || anaRes.value.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const rankings = performanceData?.rankings || [];
  const trends = performanceData?.trends || analyticsData?.completionTrends || [];
  const qualityComparison = performanceData?.qualityComparison || analyticsData?.qualityComparison || [];
  const efficiencyData = performanceData?.efficiencyMetrics || analyticsData?.efficiencyMetrics || [];
  const recommendations = performanceData?.recommendations || [];

  const sortedRankings = useMemo(() => {
    const sorted = [...rankings];
    sorted.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal?.toLowerCase() || '';
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [rankings, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={12} className="text-gray-300" />;
    return sortConfig.direction === 'asc' ? (
      <ArrowUp size={12} className="text-indigo-600" />
    ) : (
      <ArrowDown size={12} className="text-indigo-600" />
    );
  };

  if (loading) return <LoadingSpinner message="Loading performance data..." />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Federation Performance</h1>

      {/* Cooperative Rankings Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={18} className="text-yellow-500" />
          <h2 className="text-lg font-semibold text-gray-900">Cooperative Rankings</h2>
        </div>
        {rankings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-center px-3 py-3 font-medium text-gray-600 w-12">Rank</th>
                  {[
                    { key: 'name', label: 'Cooperative', align: 'text-left' },
                    { key: 'completedServices', label: 'Completed', align: 'text-center' },
                    { key: 'avgRating', label: 'Avg Rating', align: 'text-center' },
                    { key: 'responseTime', label: 'Response Time', align: 'text-center' },
                    { key: 'utilization', label: 'Utilization', align: 'text-center' },
                    { key: 'revenue', label: 'Revenue', align: 'text-right' },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className={`px-4 py-3 font-medium text-gray-600 ${col.align} cursor-pointer hover:bg-gray-50 select-none`}
                      onClick={() => handleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        <SortIcon columnKey={col.key} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedRankings.map((coop, idx) => {
                  const rank = coop.rank || idx + 1;
                  const medalClass = MEDAL_STYLES[rank];
                  return (
                    <tr
                      key={coop._id || coop.id || idx}
                      className={`hover:bg-gray-50 transition ${
                        rank <= 3 ? 'bg-gray-50/50' : ''
                      }`}
                    >
                      <td className="px-3 py-4 text-center">
                        {rank <= 3 ? (
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-xs font-bold ${medalClass}`}
                          >
                            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-medium">{rank}</span>
                        )}
                      </td>
                      <td className="px-4 py-4 font-medium text-gray-900">
                        {coop.name || coop.cooperative}
                      </td>
                      <td className="px-4 py-4 text-center text-gray-900">
                        {coop.completedServices ?? coop.completed ?? 0}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-amber-600 font-medium">
                          {(coop.avgRating ?? coop.rating ?? 0).toFixed(1)} ★
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="flex items-center justify-center gap-1 text-gray-700">
                          <Clock size={12} className="text-gray-400" />
                          {coop.responseTime ?? coop.avgResponseTime ?? 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                (coop.utilization ?? 0) >= 80
                                  ? 'bg-green-500'
                                  : (coop.utilization ?? 0) >= 50
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(coop.utilization ?? 0, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700 w-10">
                            {coop.utilization ?? 0}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-gray-900">
                        ${(coop.revenue ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">No rankings data available</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trends Line Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900">Performance Trends</h2>
          </div>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Legend />
                {rankings.slice(0, 5).map((coop, idx) => (
                  <Line
                    key={coop._id || coop.id || idx}
                    type="monotone"
                    dataKey={coop.name || coop.cooperative || `coop${idx}`}
                    stroke={COOP_COLORS[idx % COOP_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    name={coop.name || coop.cooperative || `Cooperative ${idx + 1}`}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-400">
              No trend data available
            </div>
          )}
        </div>

        {/* Service Quality Comparison */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Quality Comparison</h2>
          {qualityComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={qualityComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="cooperative" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Bar dataKey="avgRating" radius={[4, 4, 0, 0]} name="Avg Rating">
                  {qualityComparison.map((_, idx) => (
                    <Cell key={idx} fill={COOP_COLORS[idx % COOP_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-400">
              No quality comparison data
            </div>
          )}
        </div>
      </div>

      {/* Efficiency Metrics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={18} className="text-emerald-500" />
          <h2 className="text-lg font-semibold text-gray-900">Efficiency Metrics</h2>
        </div>
        {efficiencyData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cooperative</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Avg Response Time</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Completion Rate</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {efficiencyData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.cooperative || item.name}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} className="text-gray-400" />
                        {item.responseTime || item.avgResponseTime || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-indigo-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(item.completionRate || 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700">
                          {item.completionRate || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium text-gray-700">{item.utilization || 0}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">No efficiency metrics available</p>
        )}
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb size={18} className="text-amber-500" />
          <h2 className="text-lg font-semibold text-gray-900">Recommendations</h2>
        </div>
        {recommendations.length > 0 ? (
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  rec.priority === 'high'
                    ? 'bg-red-50 border-red-200'
                    : rec.priority === 'medium'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      rec.priority === 'high'
                        ? 'bg-red-200 text-red-700'
                        : rec.priority === 'medium'
                        ? 'bg-yellow-200 text-yellow-700'
                        : 'bg-blue-200 text-blue-700'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{rec.title || rec.cooperative || `Recommendation ${idx + 1}`}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {rec.description || rec.insight || rec.message || ''}
                    </p>
                    {rec.cooperative && rec.cooperative !== (rec.title || '') && (
                      <p className="text-xs text-gray-400 mt-1">
                        Related to: {rec.cooperative}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">
            No recommendations at this time. All cooperatives are performing well.
          </p>
        )}
      </div>
    </div>
  );
}
