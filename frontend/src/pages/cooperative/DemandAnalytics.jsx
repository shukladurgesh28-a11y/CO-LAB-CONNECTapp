import React, { useState, useEffect } from 'react';
import { TrendingUp, MapPin, Clock, AlertTriangle, Users, Lightbulb, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';
import DemandHeatmap from '../../components/DemandHeatmap';

const DemandAnalytics = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [demandData, setDemandData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [timePattern, setTimePattern] = useState('day');

  useEffect(() => {
    fetchDemandData();
  }, [dateRange]);

  const fetchDemandData = async () => {
    try {
      setLoading(true);
      const [demandRes, analyticsRes, heatmapRes] = await Promise.all([
        api.get('/api/cooperative/demand', {
          params: {
            startDate: dateRange.start,
            endDate: dateRange.end,
          },
        }),
        api.get('/api/analytics/demand', {
          params: {
            startDate: dateRange.start,
            endDate: dateRange.end,
          },
        }),
        api.get('/api/analytics/heatmap', {
          params: { period_days: 30 },
        }),
      ]);
      const demandPayload = demandRes.data?.data || demandRes.data;
      const analyticsPayload = analyticsRes.data?.data || analyticsRes.data;
      setDemandData({
        ...demandPayload,
        ...analyticsPayload,
      });
      setHeatmapPoints(heatmapRes.data?.data?.points || []);
    } catch (err) {
      console.error('Failed to fetch demand data:', err);
      setError('Failed to load demand analytics');
      toast.error('Failed to load demand analytics');
    } finally {
      setLoading(false);
    }
  };

  const categoryData = (demandData?.by_service || []).map((item) => ({
    category: item.service_name || `Service ${item.service_id}`,
    count: item.count,
  }));
  const locationData = [];
  const timePatternData = (demandData?.by_day || []).map((item) => ({
    time: item.date,
    count: item.count,
  }));
  const unmetDemand = [];
  const shortageIndicators = [];
  const recommendations = [];

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchDemandData}
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Demand Analytics</h1>
            <p className="text-gray-600 mt-1">
              Understand service demand patterns and workforce needs
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-80 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="h-80 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>
            <div className="h-64 bg-gray-200 rounded-xl animate-pulse"></div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Service-area demand</h2>
                  <p className="text-sm text-gray-500">Persisted request locations from the last 30 days</p>
                </div>
                <span className="text-xs text-gray-500">{heatmapPoints.length} locations</span>
              </div>
              <DemandHeatmap points={heatmapPoints} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Demand by Service Category</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="category" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3B82F6" name="Requests" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Time-based Patterns</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTimePattern('day')}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        timePattern === 'day' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      Day of Week
                    </button>
                    <button
                      onClick={() => setTimePattern('hour')}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        timePattern === 'hour' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      Hour of Day
                    </button>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timePatternData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#8B5CF6"
                        strokeWidth={2}
                        dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-400" />
                Demand by Location
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Area</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Total Requests</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Unmet Demand</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Fulfillment Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {locationData.map((location) => (
                      <tr key={location.area} className="hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">{location.area}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{location.count}</td>
                        <td className="py-3 px-4">
                          <span className={`text-sm font-medium ${location.unmet > 10 ? 'text-red-600' : location.unmet > 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {location.unmet}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  ((location.count - location.unmet) / location.count) > 0.8
                                    ? 'bg-green-500'
                                    : ((location.count - location.unmet) / location.count) > 0.6
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${((location.count - location.unmet) / location.count) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">
                              {Math.round(((location.count - location.unmet) / location.count) * 100)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Unmet Demand
                </h2>
                <div className="space-y-3">
                  {unmetDemand.map((item, index) => (
                    <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-red-900">{item.category}</p>
                          <p className="text-sm text-red-700">{item.area}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">{item.requests}</p>
                          <p className="text-xs text-red-500">{item.available} available</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-500" />
                  Workforce Shortage Indicators
                </h2>
                <div className="space-y-3">
                  {shortageIndicators.map((item, index) => (
                    <div key={index} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-orange-900">{item.category}</p>
                          <p className="text-sm text-orange-700">
                            {item.available} workers available
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-orange-600">{item.ratio}x</p>
                          <p className="text-xs text-orange-500">demand ratio</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                Recommendations
              </h2>
              <div className="space-y-3">
                {recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      rec.priority === 'high'
                        ? 'bg-red-50 border-red-200'
                        : rec.priority === 'medium'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          rec.priority === 'high'
                            ? 'bg-red-100 text-red-700'
                            : rec.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {rec.priority}
                      </span>
                      <p className="text-sm text-gray-900">{rec.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DemandAnalytics;