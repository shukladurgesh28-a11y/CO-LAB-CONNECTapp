import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Clock, AlertTriangle, ChevronRight, Inbox, ArrowUpDown } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';
import { useRealtimeSync } from '../../api/realtime';

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

const RequestQueue = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [serviceFilter, setServiceFilter] = useState('');

  const tabs = [
    { id: 'all', label: 'All', count: requests.length },
    { id: 'pending', label: 'Pending', count: requests.filter(r => r.status === 'pending').length },
    { id: 'urgent', label: 'Urgent', count: requests.filter(r => r.urgency === 'urgent').length },
    { id: 'cleaning', label: 'Cleaning', count: requests.filter(r => r.serviceCategory === 'cleaning').length },
    { id: 'plumbing', label: 'Plumbing', count: requests.filter(r => r.serviceCategory === 'plumbing').length },
    { id: 'electrical', label: 'Electrical', count: requests.filter(r => r.serviceCategory === 'electrical').length },
  ];

  const serviceCategories = [
    'cleaning',
    'plumbing',
    'electrical',
    'carpentry',
    'painting',
    'landscaping',
    'hvac',
    'general_maintenance',
  ];

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/requests', { params: { status: 'all' } });
      const requests = response.data?.data || response.data?.requests || [];
      setRequests(requests.map((request) => ({
        ...request,
        serviceName: request.serviceName || request.service_name || `Service #${request.service_id}`,
        serviceCategory: request.serviceCategory || request.service_category || request.service_name || '',
        customerArea: request.customerArea || request.location_address || 'Location not provided',
        preferredDate: request.preferredDate || request.preferred_date,
        createdAt: request.createdAt || request.created_at,
      })));
    } catch (err) {
      console.error('Failed to fetch requests:', err);
      setError('Failed to load requests');
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useRealtimeSync({
    tables: ['service_requests', 'allocations', 'notifications'],
    onChange: fetchRequests,
  });

  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const getFilteredRequests = () => {
    let filtered = [...requests];

    if (activeTab === 'pending') {
      filtered = filtered.filter(r => r.status === 'pending');
    } else if (activeTab === 'urgent') {
      filtered = filtered.filter(r => r.urgency === 'urgent');
    } else if (activeTab !== 'all') {
      filtered = filtered.filter(r => r.serviceCategory === activeTab);
    }

    if (serviceFilter) {
      filtered = filtered.filter(r => r.serviceCategory === serviceFilter);
    }

    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'urgent') {
      const urgencyOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      filtered.sort((a, b) => (urgencyOrder[a.urgency] || 3) - (urgencyOrder[b.urgency] || 3));
    }

    return filtered;
  };

  const filteredRequests = getFilteredRequests();

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchRequests}
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
          <h1 className="text-2xl font-bold text-gray-900">Request Queue</h1>
          <p className="text-gray-600 mt-1">
            Manage incoming service requests
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      activeTab === tab.id ? 'bg-blue-200' : 'bg-gray-200'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Services</option>
                {serviceCategories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setSortBy(sortBy === 'newest' ? 'urgent' : 'newest')}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                <ArrowUpDown className="w-4 h-4" />
                {sortBy === 'newest' ? 'Newest First' : 'Urgent First'}
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Inbox className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
            <p className="text-gray-500">
              {activeTab !== 'all' || serviceFilter
                ? 'Try adjusting your filters'
                : 'No service requests at the moment'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <Link
                key={request.id}
                to={`/cooperative/requests/${request.id}`}
                className="block bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{request.serviceName}</h3>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                        {request.serviceCategory?.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {request.customerArea?.slice(0, 30)}{request.customerArea?.length > 30 ? '...' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {request.preferredDate && new Date(request.preferredDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <UrgencyBadge urgency={request.urgency} />
                    <StatusBadge status={request.status} />
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    Created {getRelativeTime(request.createdAt)}
                  </span>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                    Review
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestQueue;