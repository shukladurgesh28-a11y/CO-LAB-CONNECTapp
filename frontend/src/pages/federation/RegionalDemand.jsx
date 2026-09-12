import { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  TrendingUp,
  AlertTriangle,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  ComposedChart,
  Area,
} from 'recharts';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import DemandHeatmap from '../../components/DemandHeatmap';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function RegionalDemand() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [demandData, setDemandData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;

      const [demandRes, analyticsRes, heatmapRes] = await Promise.allSettled([
        api.get('/federation/demand', { params }),
        api.get('/analytics/demand', { params }),
        api.get('/analytics/heatmap', { params: { period_days: 90 } }),
      ]);

      if (demandRes.status === 'fulfilled') {
        setDemandData(demandRes.value.data?.data || demandRes.value.data);
      }
      if (analyticsRes.status === 'fulfilled') {
        setAnalyticsData(analyticsRes.value.data?.data || analyticsRes.value.data);
      }
      if (heatmapRes.status === 'fulfilled') {
        setHeatmapPoints(heatmapRes.value.data?.data?.points || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load demand data');
    } finally {
      setLoading(false);
    }
  };

  const regionData = demandData?.byRegion || analyticsData?.byRegion || [];
  const categoryData = demandData?.byCategory || analyticsData?.byCategory || [];
  const trendData = demandData?.trends || analyticsData?.trends || [];
  const topAreas = demandData?.topAreas || analyticsData?.topAreas || [];
  const seasonalInsights = demandData?.seasonalPatterns || analyticsData?.seasonalPatterns || [];
  const capacityDemand = demandData?.capacityVsDemand || analyticsData?.capacityVsDemand || [];

  if (loading) return <LoadingSpinner message="Loading demand analysis..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Regional Demand Analysis</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Federation demand heatmap</h2>
            <p className="text-sm text-gray-500">Real request and demand-record locations</p>
          </div>
          <span className="text-xs text-gray-500">{heatmapPoints.length} locations</span>
        </div>
        <DemandHeatmap points={heatmapPoints} />
      </div>

      {/* Demand by Region */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={18} className="text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-900">Demand by Region</h2>
        </div>
        {regionData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={regionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="region" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[350px] text-gray-400">
            No regional demand data available
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demand by Service Category (Horizontal Bar) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Demand by Service Category
          </h2>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="category" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-400">
              No category data available
            </div>
          )}
        </div>

        {/* Demand Trends Line Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-emerald-500" />
            <h2 className="text-lg font-semibold text-gray-900">Demand Trends</h2>
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Total Requests"
                />
                <Line
                  type="monotone"
                  dataKey="fulfilled"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Fulfilled"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-400">
              No trend data available
            </div>
          )}
        </div>
      </div>

      {/* Top Demand Areas Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Demand Areas</h2>
        {topAreas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Area</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Count</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Fulfilled %</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Unmet Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topAreas.map((area, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900">{area.area || area.name}</td>
                    <td className="px-4 py-3 text-gray-600">{area.category}</td>
                    <td className="px-4 py-3 text-center text-gray-900">{area.count}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              (area.fulfilledPercent || 0) >= 80 ? 'bg-green-500' : (area.fulfilledPercent || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(area.fulfilledPercent || 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 w-10">
                          {(area.fulfilledPercent || 0).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`font-medium ${
                          (area.unmetCount || 0) > 10 ? 'text-red-600' : 'text-gray-900'
                        }`}
                      >
                        {area.unmetCount || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">No top areas data available</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seasonal Patterns */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">Seasonal Patterns</h2>
          </div>
          <div className="space-y-3">
            {seasonalInsights.length > 0 ? (
              seasonalInsights.map((insight, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900 text-sm">{insight.period || insight.label}</p>
                  <p className="text-xs text-gray-600 mt-1">{insight.insight || insight.description}</p>
                  {insight.demandLevel && (
                    <span
                      className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${
                        insight.demandLevel === 'high'
                          ? 'bg-red-100 text-red-700'
                          : insight.demandLevel === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {insight.demandLevel} demand
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <AlertTriangle size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-400 text-sm">No seasonal pattern data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Capacity vs Demand */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Capacity vs Demand</h2>
          {capacityDemand.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={capacityDemand}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="capacity"
                  fill="#6366f120"
                  stroke="#6366f1"
                  name="Capacity"
                />
                <Bar dataKey="demand" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Demand" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              No capacity vs demand data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
