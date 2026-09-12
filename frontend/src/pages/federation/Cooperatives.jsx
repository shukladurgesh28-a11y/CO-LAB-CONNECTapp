import { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  MapPin,
  Users,
  CheckCircle,
  Star,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';
import SearchBar from '../../components/SearchBar';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function Cooperatives() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [cooperatives, setCooperatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchCooperatives();
  }, []);

  const fetchCooperatives = async () => {
    try {
      const { data: res } = await api.get('/federation/cooperatives');
      const payload = res?.data || res;
      setCooperatives(Array.isArray(payload) ? payload : payload.cooperatives || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load cooperatives');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return cooperatives.filter((coop) => {
      const matchesSearch =
        !search ||
        coop.name?.toLowerCase().includes(search.toLowerCase()) ||
        coop.location?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' || coop.status?.toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [cooperatives, search, statusFilter]);

  const summary = useMemo(() => {
    const total = cooperatives.length;
    const avgWorkers = total
      ? (cooperatives.reduce((sum, c) => sum + (c.registeredWorkers || c.workerCount || 0), 0) / total).toFixed(1)
      : 0;
    const totalServices = cooperatives.reduce(
      (sum, c) => sum + (c.completedServices || c.completed || 0),
      0
    );
    return { total, avgWorkers, totalServices };
  }, [cooperatives]);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) return <LoadingSpinner message="Loading cooperatives..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Cooperatives</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-100'}`}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg transition ${viewMode === 'table' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-100'}`}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Total Cooperatives</p>
          <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Avg Workers / Cooperative</p>
          <p className="text-2xl font-bold text-gray-900">{summary.avgWorkers}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Total Services Completed</p>
          <p className="text-2xl font-bold text-gray-900">{summary.totalServices.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Search cooperatives..." />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-9 pr-8 py-2.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Cooperative</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Location</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-600">Workers</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-600">Services</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-600">Rating</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((coop) => (
                  <tr key={coop._id || coop.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4 font-medium text-gray-900">{coop.name}</td>
                    <td className="px-5 py-4 text-gray-600">{coop.location || 'N/A'}</td>
                    <td className="px-5 py-4 text-center text-gray-900">
                      {coop.registeredWorkers || coop.workerCount || 0}
                    </td>
                    <td className="px-5 py-4 text-center text-gray-900">
                      {coop.completedServices || coop.completed || 0}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-amber-600">
                        <Star size={14} className="fill-amber-400 text-amber-400" />
                        {(coop.avgRating || coop.rating || 0).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <StatusBadge status={coop.status || 'active'} size="sm" />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => toggleExpand(coop._id || coop.id)}
                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                      >
                        {expandedId === (coop._id || coop.id) ? (
                          <span className="flex items-center gap-1">Less <ChevronUp size={14} /></span>
                        ) : (
                          <span className="flex items-center gap-1">Details <ChevronDown size={14} /></span>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((coop) => {
            const id = coop._id || coop.id;
            const isExpanded = expandedId === id;
            return (
              <div
                key={id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{coop.name}</h3>
                    <p className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                      <MapPin size={14} />
                      {coop.location || 'N/A'}
                    </p>
                  </div>
                  <StatusBadge status={coop.status || 'active'} size="sm" />
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <Users size={16} className="mx-auto text-blue-500 mb-1" />
                    <p className="text-lg font-bold text-gray-900">
                      {coop.registeredWorkers || coop.workerCount || 0}
                    </p>
                    <p className="text-xs text-gray-500">Workers</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded-lg">
                    <CheckCircle size={16} className="mx-auto text-green-500 mb-1" />
                    <p className="text-lg font-bold text-gray-900">
                      {coop.completedServices || coop.completed || 0}
                    </p>
                    <p className="text-xs text-gray-500">Services</p>
                  </div>
                  <div className="text-center p-2 bg-amber-50 rounded-lg">
                    <Star size={16} className="mx-auto text-amber-500 mb-1" />
                    <p className="text-lg font-bold text-gray-900">
                      {(coop.avgRating || coop.rating || 0).toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-500">Rating</p>
                  </div>
                </div>

                {/* Performance Metrics */}
                {coop.performance && (
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Utilization</span>
                      <span className="font-medium text-gray-700">{coop.performance.utilization || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(coop.performance.utilization || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={() => toggleExpand(id)}
                  className="mt-4 w-full py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition flex items-center justify-center gap-1"
                >
                  {isExpanded ? (
                    <>Less <ChevronUp size={14} /></>
                  ) : (
                    <>View Details <ChevronDown size={14} /></>
                  )}
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
                    {coop.email && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email</span>
                        <span className="text-gray-900">{coop.email}</span>
                      </div>
                    )}
                    {coop.phone && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Phone</span>
                        <span className="text-gray-900">{coop.phone}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Registered</span>
                      <span className="text-gray-900">
                        {coop.createdAt ? new Date(coop.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    {coop.revenue !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Revenue</span>
                        <span className="text-gray-900 font-medium">${(coop.revenue || 0).toLocaleString()}</span>
                      </div>
                    )}
                    {coop.specializations?.length > 0 && (
                      <div>
                        <span className="text-gray-500">Specializations</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {coop.specializations.map((spec, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">
          No cooperatives found matching your criteria.
        </div>
      )}
    </div>
  );
}
